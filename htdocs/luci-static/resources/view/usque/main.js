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
    object: 'usque', method: 'status', expect: { '': {} }
});
var callRegister = rpc.declare({
    object: 'usque', method: 'register', expect: { '': {} }
});
var callStart = rpc.declare({
    object: 'usque', method: 'start', expect: { '': {} }
});
var callStop = rpc.declare({
    object: 'usque', method: 'stop', expect: { '': {} }
});

function isRunning() {
    return L.resolveDefault(callServiceList('usque'), {}).then(function (res) {
        try {
            return res['usque']['instances']['usque']['running'] === true;
        } catch (e) {
            return false;
        }
    });
}

function renderStatus(running) {
    var tpl = '<em><span style="color:%s"><strong>%s %s</strong></span></em>';
    return running
        ? tpl.format('green', _('usque'), _('RUNNING'))
        : tpl.format('red', _('usque'), _('NOT RUNNING'));
}

function renderReg(registered) {
    var tpl = '<em><span style="color:%s"><strong>%s</strong></span></em>';
    return registered
        ? tpl.format('green', _('Registered'))
        : tpl.format('orange', _('Not registered'));
}

function notify(type, msg) {
    if (!msg) return;
    ui.addNotification(null, E('p', {}, msg), type);
}

return view.extend({
    load: function () { return Promise.resolve(); },

    render: function () {
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
                    id: 'btn-register',
                    click: function (ev) { ev.preventDefault(); self.doRegister(); }
                }, _('Register')),
                ' ',
                E('button', {
                    class: 'cbi-button cbi-button-apply',
                    id: 'btn-start',
                    click: function (ev) { ev.preventDefault(); self.doStart(); }
                }, _('Start')),
                ' ',
                E('button', {
                    class: 'cbi-button cbi-button-reset',
                    id: 'btn-stop',
                    click: function (ev) { ev.preventDefault(); self.doStop(); }
                }, _('Stop'))
            ])
        ]);

        this.refresh();
        poll.add(L.bind(this.refresh, this), 5);
        return c;
    },

    refresh: function () {
        return Promise.all([
            L.resolveDefault(callStatus(), {}),
            isRunning()
        ]).then(L.bind(function (res) {
            var reg = !!(res[0] && res[0].registered);
            var run = !!res[1];

            var rEl = document.getElementById('reg-status');
            if (rEl) rEl.innerHTML = renderReg(reg);

            var sEl = document.getElementById('run-status');
            if (sEl) sEl.innerHTML = renderStatus(run);

            var bReg = document.getElementById('btn-register');
            var bStart = document.getElementById('btn-start');
            var bStop = document.getElementById('btn-stop');
            if (bReg) bReg.disabled = reg;         // 已注册不可重复注册
            if (bStart) bStart.disabled = run || !reg;
            if (bStop) bStop.disabled = !run;
        }, this));
    },

    doRegister: function () {
        var self = this;
        ui.showModal(_('Registering…'),
            [E('p', { class: 'spinning' }, _('Please wait…'))]);

        return callRegister().then(function (res) {
            ui.hideModal();
            if (!res || res.success !== true) {
                notify('error', (res && res.message) || _('Registration failed'));
            } else {
                notify('info', _('Registration successful'));
            }
            return self.refresh();
        }).catch(function (e) {
            ui.hideModal();
            notify('error', _('Registration failed: ') + e);
        });
    },

    doStart: function () {
        var self = this;
        ui.showModal(_('Starting…'),
            [E('p', { class: 'spinning' }, _('Please wait…'))]);

        return callStart().then(function (res) {
            ui.hideModal();
            if (!res || res.success !== true) {
                notify('error', (res && res.message) || _('Start failed'));
            } else if (res.network === false) {
                notify('warning',
                    (res && res.message) || _('Service started but network not ready'));
            } else {
                notify('info', _('Started'));
            }
            return self.refresh();
        }).catch(function (e) {
            ui.hideModal();
            notify('error', _('Start failed: ') + e);
        });
    },

    doStop: function () {
        var self = this;
        return callStop().then(function (res) {
            if (res && res.success === false) {
                notify('error', res.message || _('Stop failed'));
            }
            return self.refresh();
        });
    }
});