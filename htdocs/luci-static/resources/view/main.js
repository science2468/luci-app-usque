'use strict';
'require view';
'require rpc';
'require uci';
'require poll';
'require ui';

var callStatus = rpc.declare({
    object: 'usque',
    method: 'status',
    expect: { }
});

var callRegister = rpc.declare({
    object: 'usque',
    method: 'register',
    expect: { success: false, message: '' }
});

var callStart = rpc.declare({
    object: 'usque',
    method: 'start',
    expect: { success: false, message: '' }
});

var callStop = rpc.declare({
    object: 'usque',
    method: 'stop',
    expect: { success: false, message: '' }
});

return view.extend({
    load: function() {
        return uci.load('usque');
    },

    render: function() {
        var self = this;
        var status = { running: false, registered: false };

        var container = E('div', { 'class': 'cbi-map' }, [
            E('h2', {}, _('Usque Control')),
            E('div', { 'class': 'cbi-map-descr' },
                _('Register, start and stop the usque service')),

            // 状态卡片
            E('div', { 'class': 'cbi-section', 'id': 'usque-status-card' }, [
                E('h3', {}, _('Status')),
                E('div', { 'class': 'cbi-value' }, [
                    E('label', { 'class': 'cbi-value-title' }, _('Service')),
                    E('div', { 'class': 'cbi-value-field', 'id': 'usque-run-status' },
                        E('em', {}, _('Loading…')))
                ]),
                E('div', { 'class': 'cbi-value' }, [
                    E('label', { 'class': 'cbi-value-title' }, _('Registration')),
                    E('div', { 'class': 'cbi-value-field', 'id': 'usque-reg-status' },
                        E('em', {}, _('Loading…')))
                ])
            ]),

            // 操作按钮
            E('div', { 'class': 'cbi-section' }, [
                E('h3', {}, _('Actions')),

                // 注册按钮
                E('button', {
                    'class': 'cbi-button cbi-button-action',
                    'id': 'btn-register',
                    'click': function(ev) {
                        ev.preventDefault();
                        self.handleRegister();
                    }
                }, _('Register (generate config.json)')),

                ' ',

                // 启动按钮
                E('button', {
                    'class': 'cbi-button cbi-button-apply',
                    'id': 'btn-start',
                    'click': function(ev) {
                        ev.preventDefault();
                        self.handleStart();
                    }
                }, _('Start')),

                ' ',

                // 停止按钮
                E('button', {
                    'class': 'cbi-button cbi-button-reset',
                    'id': 'btn-stop',
                    'click': function(ev) {
                        ev.preventDefault();
                        self.handleStop();
                    }
                }, _('Stop'))
            ]),

            // 输出日志
            E('div', { 'class': 'cbi-section', 'id': 'usque-log-section',
                        'style': 'display:none' }, [
                E('h3', {}, _('Output')),
                E('pre', { 'id': 'usque-log',
                           'style': 'max-height:300px;overflow:auto;' +
                                    'background:#f5f5f5;padding:10px;' })
            ])
        ]);

        // 首次加载状态 + 轮询
        this.refreshStatus();

        poll.add(function() {
            return self.refreshStatus();
        }, 5);

        return container;
    },

    refreshStatus: function() {
        var self = this;
        return callStatus().then(function(res) {
            if (!res) return;

            var runEl = document.getElementById('usque-run-status');
            var regEl = document.getElementById('usque-reg-status');

            if (runEl) {
                runEl.innerHTML = res.running
                    ? '<span style="color:green;font-weight:bold;">' +
                      _('Running') + '</span>'
                    : '<span style="color:red;">' + _('Stopped') + '</span>';
            }

            if (regEl) {
                regEl.innerHTML = res.registered
                    ? '<span style="color:green;">' +
                      _('Registered') + '</span>'
                    : '<span style="color:orange;">' +
                      _('Not registered') + '</span>';
            }

            // 根据注册状态控制按钮可用性
            var btnStart = document.getElementById('btn-start');
            var btnStop = document.getElementById('btn-stop');

            if (btnStart) {
                btnStart.disabled = !res.registered || res.running;
            }
            if (btnStop) {
                btnStop.disabled = !res.running;
            }
        });
    },

    showLog: function(text) {
        var section = document.getElementById('usque-log-section');
        var pre = document.getElementById('usque-log');
        if (section && pre) {
            section.style.display = '';
            pre.textContent = text;
        }
    },

    handleRegister: function() {
        var self = this;
        ui.showModal(_('Registering…'), [
            E('p', { 'class': 'spinning' }, _('Please wait…'))
        ]);

        callRegister().then(function(res) {
            ui.hideModal();
            self.showLog(res.message || '');
            if (res.success) {
                ui.addNotification(null,
                    E('p', {}, _('Registration successful. config.json generated.')),
                    'info');
            } else {
                ui.addNotification(null,
                    E('p', {}, _('Registration failed: ') + (res.message || '')),
                    'error');
            }
            return self.refreshStatus();
        }).catch(function(err) {
            ui.hideModal();
            ui.addNotification(null,
                E('p', {}, _('RPC error: ') + err), 'error');
        });
    },

    handleStart: function() {
        var self = this;
        callStart().then(function(res) {
            if (res.success) {
                ui.addNotification(null,
                    E('p', {}, _('Service started.')), 'info');
            } else {
                ui.addNotification(null,
                    E('p', {}, _('Start failed: ') + (res.message || '')),
                    'error');
            }
            return self.refreshStatus();
        });
    },

    handleStop: function() {
        var self = this;
        callStop().then(function(res) {
            if (res.success) {
                ui.addNotification(null,
                    E('p', {}, _('Service stopped.')), 'info');
            } else {
                ui.addNotification(null,
                    E('p', {}, _('Stop failed: ') + (res.message || '')),
                    'error');
            }
            return self.refreshStatus();
        });
    }
});