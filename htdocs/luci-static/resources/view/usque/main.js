'use strict';
'require view';
'require poll';
'require rpc';
'require ui';

var callServiceList = rpc.declare({
    object: 'service', method: 'list',
    params: ['name'], expect: { '': {} }
});
var callStatus = rpc.declare({
    object: 'usque', method: 'status'
});
var callRegister = rpc.declare({
    object: 'usque', method: 'register'
});
var callStart = rpc.declare({
    object: 'usque', method: 'start'
});
var callStop = rpc.declare({
    object: 'usque', method: 'stop'
});

function isRunning() {
    return L.resolveDefault(callServiceList('usque'), {}).then(function(res) {
        var isRunning = false;
        try {
            isRunning = res['usque']['instances']['usque']['running'];
        } catch (e) { }
        return isRunning;
    });
}

// hev 风格的状态渲染
function renderStatus(isRunning) {
    var spanTemp = '<em><span style="color:%s"><strong>%s %s</strong></span></em>';
    if (isRunning) {
        return spanTemp.format('green', _('usque'), _('RUNNING'));
    } else {
        return spanTemp.format('red', _('usque'), _('NOT RUNNING'));
    }
}

function renderReg(registered) {
    var spanTemp = '<em><span style="color:%s"><strong>%s</strong></span></em>';
    if (registered) {
        return spanTemp.format('green', _('Registered'));
    } else {
        return spanTemp.format('orange', _('Not registered'));
    }
}

return view.extend({
    load: function() { return Promise.resolve(); },

    render: function() {
        var self = this;

        var c = E('div', { class: 'cbi-map' }, [
            E('h2', {}, _('Usque')),
            E('div', { class: 'cbi-section', id: 'status_bar' }, [
                E('p', {}, [
                    _('Registration: '),
                    E('span', { id: 'reg-status' }, _('Collecting data...'))
                ]),
                E('p', {}, [
                    _('Service: '),
                    E('span', { id: 'run-status' }, _('Collecting data...'))
                ])
            ]),
            E('div', { class: 'cbi-section' }, [
                E('button', {
                    class: 'cbi-button cbi-button-action',
                    click: function(ev) { ev.preventDefault(); self.doRegister(); }
                }, _('Register')),
                ' ',
                E('button', {
                    class: 'cbi-button cbi-button-apply',
                    id: 'btn-start',
                    click: function(ev) { ev.preventDefault(); self.doStart(); }
                }, _('Start')),
                ' ',
                E('button', {
                    class: 'cbi-button cbi-button-reset',
                    id: 'btn-stop',
                    click: function(ev) { ev.preventDefault(); self.doStop(); }
                }, _('Stop'))
            ])
        ]);

        this.refresh();
        poll.add(function() { return self.refresh(); }, 5);
        return c;
    },

    refresh: function() {
        return Promise.all([
            L.resolveDefault(callStatus(), {}),
            isRunning()
        ]).then(function(res) {
            var reg = res[0] && res[0].registered;
            var run = res[1];

            var rEl = document.getElementById('reg-status');
            if (rEl) rEl.innerHTML = renderReg(reg);

            var sEl = document.getElementById('run-status');
            if (sEl) sEl.innerHTML = renderStatus(run);

            var s = document.getElementById('btn-start');
            var t = document.getElementById('btn-stop');
            if (s) s.disabled = run || !reg;
            if (t) t.disabled = !run;
        });
    },

    doRegister: function() {
        var self = this;
        ui.showModal(_('Registering…'),
            [E('p', { class: 'spinning' }, _('Please wait…'))]);

        callRegister().then(function() {
            ui.hideModal();
            return self.refresh();
        }).then(function() {
            return new Promise(function(r) { setTimeout(r, 2000); });
        }).then(function() {
            return self.refresh();
        });
    },

    doStart: function() {
        var self = this;
        callStart().then(function() { return self.refresh(); });
    },

    doStop: function() {
        var self = this;
        callStop().then(function() { return self.refresh(); });
    }
});