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
    object: 'usque', method: 'status',
    expect: { registered: false }
});
var callRegister = rpc.declare({
    object: 'usque', method: 'register',
    expect: { success: false }
});
var callStart = rpc.declare({
    object: 'usque', method: 'start',
    expect: { success: false }
});
var callStop = rpc.declare({
    object: 'usque', method: 'stop',
    expect: { success: false }
});

function isRunning() {
    return L.resolveDefault(callServiceList('usque'), {}).then(function(res) {
        try {
            var i = res.usque.instances;
            for (var k in i) if (i[k].running) return true;
        } catch (e) {}
        return false;
    });
}

return view.extend({
    load: function() { return Promise.resolve(); },

    render: function() {
        var self = this;

        var c = E('div', { class: 'cbi-map' }, [
            E('h2', {}, _('Usque')),
            E('div', { class: 'cbi-section' }, [
                E('p', {}, [
                    _('Registration: '),
                    E('span', { id: 'reg-status' }, '…')
                ]),
                E('p', {}, [
                    _('Service: '),
                    E('span', { id: 'run-status' }, '…')
                ]),
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
            L.resolveDefault(callStatus(), { registered: false }),
            isRunning()
        ]).then(function(res) {
            var reg = res[0].registered;
            var run = res[1];

            var rEl = document.getElementById('reg-status');
            if (rEl) rEl.innerHTML = reg
                ? '<span style="color:green;font-weight:bold;">' +
                  _('Registered') + '</span>'
                : '<span style="color:orange;">' +
                  _('Not registered') + '</span>';

            var sEl = document.getElementById('run-status');
            if (sEl) sEl.innerHTML = run
                ? '<span style="color:green;font-weight:bold;">' +
                  _('RUNNING') + '</span>'
                : '<span style="color:red;font-weight:bold;">' +
                  _('NOT RUNNING') + '</span>';

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