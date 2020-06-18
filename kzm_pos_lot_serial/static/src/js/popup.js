odoo.define('kzm_pos_lot_serial.popup', function (require) {
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

    var PackLotLinePopupWidget = PopupWidget.extend({
        template: 'PackLotLinePopupWidget',
        events: _.extend({}, PopupWidget.prototype.events, {
            'click .remove-lot': 'remove_lot',
            'click .select-lot': 'select_lot',
            'keydown .popup-input': 'add_lot',
            'blur .packlot-line-input': 'lose_input_focus',
            'keyup .popup-search': 'seach_lot',
        }),
        show: function(options){
            this._super(options);
            this.focus();
            var self = this;
            var order = this.pos.get_order();
            var serials = options.serials;
            _.each(order.get_orderlines(),function(item) {
                for(var i=0; i < item.pack_lot_lines.length; i++){
                    var lot_line = item.pack_lot_lines.models[i];
                    if(serials.length != 0){
                        for(var j=0 ; j < serials.length ; j++){
                            if(serials[j].name == lot_line.get('lot_name')){
                                serials[j]['remaining_qty'] = serials[j]['remaining_qty'] - 1;
                            }
                        }
                    }
                }
            });
            this.renderElement();
        },
        click_confirm: function(){
            var order = this.pos.get_order();
            var order_line = order.get_selected_orderline();
            var pack_lot_lines = this.options.pack_lot_lines;
            this.$('.packlot-line-input').each(function(index, el){
                var cid = $(el).attr('cid'),
                    lot_name = $(el).val();
                var pack_line = pack_lot_lines.get({cid: cid});
                pack_line.set_lot_name(lot_name);
            });
            pack_lot_lines.remove_empty_model();
            if(order_line.product.tracking == 'serial'){
                pack_lot_lines.set_quantity_by_lot();
            } else{
                this.set_quantity_by_lot(pack_lot_lines)
            }
            this.options.order.save_to_db();
            this.gui.close_popup();
        },
        click_cancel: function(){
            if(!this.pos.config.enable_pos_serial){
                this.gui.close_popup();
                return
            }
            var pack_lot_lines = this.options.pack_lot_lines;
            if(pack_lot_lines.length > 0){
                if(!confirm(_t("Are you sure you want to unassign lot/serial number(s) ?"))){
                    return
                }
            }
            var self = this;
            this.$('.packlot-line-input').each(function(index, el){
                var cid = $(el).attr('cid'),
                    lot_name = $(el).val();
                var lot_model = pack_lot_lines.get({cid: cid});
                lot_model.remove();
                var serials = self.options.serials;
                for(var i=0 ; i < serials.length ; i++){
                    if(serials[i].name == lot_name){
                        serials[i]['remaining_qty'] = serials[i]['remaining_qty'] + 1;
                        break
                    }
                }
            });
            var order = this.pos.get_order();
            var order_line = order.get_selected_orderline();
            self.renderElement()
            self.pos.chrome.screens.products.order_widget.rerender_orderline(order_line);
            this.gui.close_popup();
        },
        get_valid_lots: function(lots){
            return lots.filter(function(model){
                return model.get('lot_name');
            });
        },
        set_quantity_by_lot: function(lot_lines) {
            var order = this.pos.get_order();
            var order_line = order.get_selected_orderline();
            var valid_lots = this.get_valid_lots(lot_lines.models);
            order_line.set_quantity(valid_lots.length);
        },
        select_lot: function(ev) {
            var $i = $(ev.target);
            var data = $i.attr('data');
            var add_qty = $(ev.currentTarget).find("input").val();
            var order = this.pos.get_order();
            var order_line = order.get_selected_orderline();
            if(data && add_qty){
                for(var i=0; i< add_qty;i++){
                    this.focus();
                    this.$("input[autofocus]").val(data);
                    this.add_lot(false,true);
                }
            }
        },
        add_lot: function(ev,val) {
            if ((ev && ev.keyCode === $.ui.keyCode.ENTER)|| val){
                var pack_lot_lines = this.options.pack_lot_lines,
                    $input = ev ? $(ev.target) : this.$("input[autofocus]"),
                    cid = $input.attr('cid'),
                    lot_name = $input.val();
                var serials = this.options.serials;
                if(serials.length != 0){
                    var flag = true
                    for(var i=0 ; i < serials.length ; i++){
                        if(serials[i].name == lot_name){
                            if((serials[i]['remaining_qty'] - 1) < 0){
                                flag = true;
                            } else {
                                if(serials[i].life_date){
                                    if(moment(new moment().add(this.pos.config.product_exp_days, 'd').locale('en').format('YYYY-MM-DD HH:mm:mm')) < moment(serials[i].life_date)){
                                        serials[i]['remaining_qty'] = serials[i]['remaining_qty'] - 1;
                                        flag = false;
                                    }
                                }else{
                                    serials[i]['remaining_qty'] = serials[i]['remaining_qty'] - 1;
                                    flag = false;
                                }
                            }
                            break
                        }
                    }
                    if(flag){
                        $input.css('border','5px solid red');
                        $input.val('');
                        return
                    }
                }
                var lot_model = pack_lot_lines.get({cid: cid});
                lot_model.set_lot_name(lot_name);  // First set current model then add new one
                if(!pack_lot_lines.get_empty_model()){
                    var new_lot_model = lot_model.add();
                    this.focus_model = new_lot_model;
                }
                pack_lot_lines.set_quantity_by_lot();
                this.renderElement();
                this.focus();
            }
        },
        remove_lot: function(ev){
            var pack_lot_lines = this.options.pack_lot_lines,
                $input = $(ev.target).prev(),
                cid = $input.attr('cid'),
                lot_name = $input.val();
            if(lot_name){
                var lot_model = pack_lot_lines.get({cid: cid});
                lot_model.remove();
                pack_lot_lines.set_quantity_by_lot();
                var serials = this.options.serials;
                for(var i=0 ; i < serials.length ; i++){
                    if(serials[i].name == lot_name){
                        serials[i]['remaining_qty'] = serials[i]['remaining_qty'] + 1;
                        break
                    }
                }
                this.renderElement();
            }
        },
        seach_lot: function(ev){
            var self = this;
            var valThis = $(ev.target).val().toLowerCase();
            var sr_list = [];
            $('.select-lot').each(function(){
                var text = $(this).attr('data');
                (text.indexOf(valThis) == 0) ? sr_list.push(text) : "";
            });
            var serials = this.options.serials;
            var sr = [];
            var all_sr = [];
            for(var i=0 ; i < serials.length ; i++){
                if($.inArray(serials[i].name, sr_list) !== -1 && serials[i].remaining_qty > 0){
                    sr.push(serials[i]);
                }
                if(serials[i].remaining_qty > 0){
                    all_sr.push(serials[i])
                }
            }
            if(sr.length != 0 && valThis != ""){
                this.render_list(sr);
            } else {
                this.render_list(all_sr);
            }
        },
        render_list: function(orders){
            if(!orders){
                return
            }
            var self = this;
            var contents = $('.serial-list-contents');
            contents.html('');
            var temp = [];
            for(var i = 0, len = Math.min(orders.length,1000); i < len; i++){
                var serial    = orders[i];
                serial.check_expire_alert =moment(new moment().add(self.pos.config.product_exp_days, 'd').format('YYYY-MM-DD HH:mm:mm')).format('YYYY/MM/DD');
                serial.check_serial_life =moment(serial.life_date).locale('en').format('YYYY/MM/DD');
                var clientline_html = QWeb.render('listLine',{widget: this, serial:serial});
                var clientline = document.createElement('tbody');
                clientline.innerHTML = clientline_html;
                clientline = clientline.childNodes[1];
                contents.append(clientline);
            }
            // $("table#lot_list").simplePagination({
            // 	previousButtonClass: "btn btn-danger",
            // 	nextButtonClass: "btn btn-danger",
            // 	previousButtonText: '<i class="fa fa-angle-left fa-lg"></i>',
            // 	nextButtonText: '<i class="fa fa-angle-right fa-lg"></i>',
            // 	perPage:10
            // });
        },
        lose_input_focus: function(ev){
            var $input = $(ev.target),
                cid = $input.attr('cid');
            var lot_model = this.options.pack_lot_lines.get({cid: cid});
            lot_model.set_lot_name($input.val());
        },
        renderElement: function(){
            this._super();
            var serials = this.options.serials;
            var serials_lst = []
            if(serials){
                for(var i=0 ; i < serials.length ; i++){
                    if(serials[i].remaining_qty > 0){
                        serials_lst.push(serials[i])
                    }
                }
                this.render_list(serials_lst);
            }
        },
        focus: function(){
            this.$("input[autofocus]").focus();
            this.focus_model = false;   // after focus clear focus_model on widget
        }
    });
    gui.define_popup({name:'packlotline', widget:PackLotLinePopupWidget});


    });