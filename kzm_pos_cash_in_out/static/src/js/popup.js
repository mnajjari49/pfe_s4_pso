odoo.define('kzm_pos_cash_in_out.popup', function (require) {
    "use strict";
    var gui = require('point_of_sale.gui');
    var rpc = require('web.rpc');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
    var PopupWidget = require('point_of_sale.popups');
//    var popups = require('point_of_sale.popups');
    var core = require('web.core');
    var chrome = require('point_of_sale.chrome');
    var models = require('point_of_sale.models');
    var framework = require('web.framework');
    var utils = require('web.utils');
    var field_utils = require('web.field_utils');
    var round_pr = utils.round_precision;
    var round_di = utils.round_decimals;

    var _t = core._t;
    var QWeb = core.qweb;

    var PrintCashInOutStatmentPopup = PopupWidget.extend({
        template: 'PrintCashInOutStatmentPopup',
        show: function(){
            var self = this;
            this._super();
            this.renderElement();
        },
        click_confirm: function(){
            var self = this;
            var users = self.pos.users;
            var order = self.pos.get_order();
            var start_date = $('.start-date input').val() + ' 00:00:00';
            var end_date = $('.end-date input').val() + ' 23:59:59';
            self.pos.money_start_date = $('.start-date input').val();
            self.pos.money_end_date = $('.end-date input').val();
            var user_id = $('#user-id').find(":selected").text();
            var domain = [];
            order.set_statement_cashier(user_id);
            if(user_id){
                if($('.start-date input').val() && $('.end-date input').val()){
                    domain = [['create_date', '>=', start_date],['create_date', '<=', end_date],['user_id', '=', Number($('#user-id').val())]];
                }
                else if($('.start-date input').val()){
                    domain = [['create_date', '>=', start_date],['user_id', '=', Number($('#user-id').val())]];
                }
                else if($('.end-date input').val()){
                    domain = [['create_date', '<=', end_date],['user_id', '=', Number($('#user-id').val())]];
                }else{
                    domain = [['user_id', '=', Number($('#user-id').val())]];
                }
            }else{
                if($('.start-date input').val() && $('.end-date input').val()){
                    domain = [['create_date', '>=', start_date],['create_date', '<=', end_date]];
                }
                else if($('.start-date input').val()){
                    domain = [['create_date', '>=', start_date]];
                }
                else if($('.end-date input').val()){
                    domain = [['create_date', '<=', end_date]];
                }else{
                    domain = [];
                }
            }
            var params = {
                model: 'cash.in.out.history',
                method: 'search_read',
                domain: domain,
            }
            rpc.query(params, {async: false}
            ).then(function(result){
                var order = self.pos.get_order();
                if(user_id && result){
                    order.set_cash_register(result);
                    if(start_date && end_date){
                        if(result.length > 0){
                            self.gui.show_screen('receipt');
                        } else{
                            alert("No records found!");
                        }
                    }
                }else{
                    var data = {};
                    users.map(function(user){
                        var new_records = [];
                        result.map(function(record){
                            if(record.user_id[0] == user.id){
                                new_records.push(record)
                            }
                        });
                        data[user.id] = new_records;
                    });
                    var flag = false;
                    for (var key in data) {
                        if(data[key].length > 0){
                            flag = true;
                        }
                    }
                    if(flag){
                        order.set_cash_register(data);
                        self.gui.show_screen('receipt');
                    }
                }
            });
        },
    });
    gui.define_popup({name:'cash_inout_statement_popup', widget: PrintCashInOutStatmentPopup});

    var CashOperationPopup = PopupWidget.extend({
        template: 'CashOperationPopup',
        show: function(options){
            this._super(options);
            $('.reason').focus();
            this.$('.amount').keypress(function (evt) {
                var $txtBox = $(this);
                var charCode = (evt.which) ? evt.which : evt.keyCode
                if (charCode > 31 && (charCode < 48 || charCode > 57) && charCode != 46)
                    return false;
                else {
                    var len = $txtBox.val().length;
                    var index = $txtBox.val().indexOf('.');
                    if (index > 0 && charCode == 46) {
                      return false;
                    }
                    if (index > 0) {
                        var charAfterdot = (len + 1) - index;
                        if (charAfterdot > 3) {
                            return false;
                        }
                    }
                }
                return $txtBox;
            });
        },
        click_confirm: function(){
            var self = this;
            var name = $('.reason').val() || false;
            var amount = $('.amount').val() || false;
            if(name =='' || amount == ''){
                self.pos.db.notification('danger',_t("Please fill all fields."));
                $('.reason').focus();
            }else if(!$.isNumeric(amount)){
                self.pos.db.notification('danger',_t("Please input valid amount."));
                $('.amount').val('').focus();
            }else{
                var session_id = '';
                var vals = {
                    'session_id': self.pos.pos_session.id,
                    'name': name,
                    'amount': amount,
                    'operation': self.options.operation,
                    'cashier': self.pos.get_cashier().id,
                }
                var params = {
                    model: 'pos.session',
                    method: 'cash_in_out_operation',
                    args: [vals],
                }
                rpc.query(params, {async: false}).then(function(result) {
                    if (result['error']) {
                        self.gui.show_popup('error',{
                            'title': _t('Error'),
                            'body': _t(result['error']),
                        });
                    }else {
                        var order = self.pos.get_order();
                        var operation = self.options.operation == "take_money" ? 'Take Money Out' : 'Put Money In'
                        if(order && self.pos.config.money_in_out_receipt){
                            order.set_money_inout_details({
                                'operation': operation,
                                'reason': name,
                                'amount': amount,
                            });
                        }
                        if(self.pos.config.iface_cashdrawer){
                            self.pos.proxy.open_cashbox();
                        }
                        if(self.pos.config.money_in_out_receipt){
                            self.gui.show_screen('receipt');
                        }
                        self.gui.close_popup();
                    }
                }).catch(function(error, event) {
                    alert("fail")
                    if (error.code === -32098) {
                        alert("Server closed...");
                        event.preventDefault();
                    }
                });
            }
        },
    });
    gui.define_popup({name:'cash_operation_popup', widget: CashOperationPopup});


    });