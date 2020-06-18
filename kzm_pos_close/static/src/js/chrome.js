odoo.define('kzm_pos_close.chrome', function (require) {
"use strict";

    var chrome = require('point_of_sale.chrome');
    var gui = require('point_of_sale.gui');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var ActionManager = require('web.ActionManager');
    var models = require('point_of_sale.models');
    var session = require('web.session');
    var bus_service = require('bus.BusService');
    var bus = require('bus.Longpolling');
    var cross_tab = require('bus.CrossTab').prototype;

    var _t = core._t;
    var QWeb = core.qweb;


//    chrome.Chrome.include({
//        events: {
//            "click #product_sync": "product_sync",
//            "click #pos_lock": "pos_lock",
//            "click #messages_button": "messages_button",
//            "click #close_draggable_panal": "close_draggable_panal",
//            "click #delete_msg_history": "delete_msg_history",
//            "click #delivery_list_chrome": "delivery_list_chrome",
//            "click #close_draggable_panal_delivery_order" :"close_draggable_panal_delivery_order",
//            /*Order Sync*/
//            "click #sale_note_chrome": "sale_note_chrome",
//            'click #quick_delete_draft_order' : "quick_delete_draft_order",
//            'click #pay_quick_order' : "pay_quick_draft_order",
//            "click .close_incoming_order_panel" :"close_incoming_order_panel",
//        },
//        /*Order Sync Start*/
//        pay_quick_draft_order: function(event){
//            self = this;
//            var order_id = parseInt($(event.currentTarget).data('id'));
//            self.pos.gui.screen_instances.orderlist.pay_order_due(false, order_id);
//            self.pos.chrome.close_incoming_order_panel()
//        },
//        quick_delete_draft_order: function(event){
//            var self = this;
//            var selectedOrder = this.pos.get_order();
//            var order_id = parseInt($(event.currentTarget).data('id'));
//            var selectedOrder = this.pos.get_order();
//            var result = self.pos.db.get_sale_note_by_id(order_id);
//            if (result && result.lines.length > 0) {
//                var params = {
//                    model: 'pos.order',
//                    method: 'unlink',
//                    args: [result.id],
//                }
//                rpc.query(params, {async: false}).then(function(result){});
//            }
//            var sale_note_to_be_remove = self.pos.db.get_sale_note_by_id(result.id)
//            var sale_note_list = self.pos.db.get_sale_note_list();
//            sale_note_list = _.without(sale_note_list, _.findWhere(sale_note_list, { id: sale_note_to_be_remove.id }));
//            self.screens.sale_note_list.render_list(sale_note_list)
//            self.render_sale_note_order_list(sale_note_list);
//            self.pos.db.add_sale_note(sale_note_list)
//        },
//        render_sale_note_order_list: function(orders){
//            var self = this;
//            if(orders){
//                var contents = $('.message-panel-body1');
//                contents.html("");
//                var order_count = 0;
//                for(var i = 0, len = Math.min(orders.length,1000); i < len; i++){
//                    var order = orders[i];
//                    if(order.state == "draft"){
//                        order_count ++;
//                        var orderlines = [];
//                        order.amount_total = parseFloat(order.amount_total).toFixed(2);
//                        var clientline_html = QWeb.render('SaleNoteQuickWidgetLine',{widget: this, order:order, orderlines:orderlines});
//                        var clientline = document.createElement('tbody');
//                        clientline.innerHTML = clientline_html;
//                        clientline = clientline.childNodes[1];
//                        contents.append(clientline);
//                    }
//                }
//                self.pos.order_quick_draft_count = order_count
//                $('.notification-count').show();
//                $('.draft_order_count').text(order_count);
//            }
//        },
//        sale_note_chrome: function(){
//            var self = this;
//            if($('#draggablePanelList_sale_note.draft_order').css('display') == 'none'){
//                $('#draggablePanelList_sale_note.draft_order').animate({
//                    height: 'toggle'
//                    }, 200, function() {
//                });
//                var draft_orders = _.filter(self.pos.get('pos_order_list'), function(item) {
//                     return item.state == 'draft'
//                });
//                self.render_sale_note_order_list(draft_orders);
//                $('#draggablePanelList_sale_note.draft_order .head_data_sale_note').html(_t("Orders"));
//                $('#draggablePanelList_sale_note.draft_order .panel-body').html("Message-Box Empty");
//            }else{
//                $('#draggablePanelList_sale_note.draft_order').animate({
//                    height: 'toggle'
//                    }, 200, function() {
//                });
//            }
//        },
//        /*Order Sync End*/
//        delivery_list_chrome: function(){
//            var self = this;
//            if($('#draggablePanelList_delivery_order').css('display') == 'none'){
//                $('#draggablePanelList_delivery_order').animate({
//                    height: 'toggle'
//                    }, 200, function() {
//                });
//                var delivery_orders = _.filter(self.pos.get('pos_order_list'), function(item) {
//                     return item.delivery_type == 'pending'
//                });
//                self.render_delivery_order_list(delivery_orders);
//                $('#head_data_delivery_orders').text(_t("Delivery Orders"));
//            } else{
//                $('#draggablePanelList_delivery_order').animate({
//                    height: 'toggle'
//                    }, 200, function() {
//                });
//            }
//        },
//        close_incoming_order_panel: function(){
//	        $('#draggablePanelList_sale_note').animate({
//	            height: 'toggle'
//	            }, 200, function() {
//	        });
//        },
//        close_draggable_panal_delivery_order: function(){
//            $('#draggablePanelList_delivery_order').animate({
//                height: 'toggle'
//                }, 200, function() {
//            });
//        },
//        product_sync: function(){
//            var self = this;
//            self.pos.load_new_products();
//            $('.prodcut_sync').toggleClass('rotate', 'rotate-reset');
//        },
//        build_widgets: function(){
//            var self = this;
//            this._super();
//            /*if(!self.pos.load_background){
//                self.$el.find('#product_sync').trigger('click');
//            }*/
//            if(!self.pos.is_rfid_login){
//                $('.page-container').css({
//                    'width':'100%',
//                });
//            }
//            self.slider_widget = new SliderWidget(this);
//            self.pos_cart_widget = new PosCartCountWidget(this);
//            self.slider_widget.replace(this.$('.placeholder-SliderWidget'));
//            self.pos_cart_widget.replace(this.$('.placeholder-PosCartCountWidget'));
//            self.gui.set_startup_screen('login');
//            self.gui.show_screen('login');
//            this.call('bus_service', 'updateOption','lock.data',session.uid);
//            cross_tab._isRegistered = true;
//            cross_tab._isMasterTab = true;
//            this.call('bus_service', 'startPolling');
//            this.call('bus_service', 'onNotification', self, self._onNotification);
//            this.call('bus_service', '_poll');
//        },
//        save_receipt_for_reprint:function(){
//            var self = this;
//            var order = this.pos.get_order();
//            var env = {
//                widget:self,
//                pos: this.pos,
//                order: order,
//                receipt: order.export_for_printing(),
//                orderlines: order.get_orderlines(),
//                paymentlines: order.get_paymentlines(),
//            };
//            var receipt_html = QWeb.render('PosTicket',env);
//            order.set_pos_normal_receipt_html(receipt_html.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));
//            var receipt = QWeb.render('XmlReceipt',env);
//            order.set_pos_xml_receipt_html(receipt.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));
//        },
//        _onNotification: function(notifications){
//            var self = this;
//            for (var notif of notifications) {
//                if(notif[1] && notif[1].terminal_lock){
//                    if(notif[1].terminal_lock[0]){
//                        if(self.pos.pos_session && (notif[1].terminal_lock[0].session_id[0] == self.pos.pos_session.id)){
//                            self.pos.set_lock_status(notif[1].terminal_lock[0].lock_status);
//                            self.pos.set_lock_data(notif[1].terminal_lock[0]);
//                        }
//                    }
//                } else if(notif[1] && notif[1].terminal_message){
//                    if(notif[1].terminal_message[0]){
//                        if(self.pos.pos_session.id == notif[1].terminal_message[0].message_session_id[0]){
//                            var message_index = _.findIndex(self.pos.message_list, function (message) {
//                                return message.id === notif[1].terminal_message[0].id;
//                            });
//                            if(message_index == -1){
//                                self.pos.message_list.push(notif[1].terminal_message[0]);
//                                self.render_message_list(self.message_list);
//                                $('#message_icon').css("color", "#5EB937");
//                                self.pos.db.notification('info',notif[1].terminal_message[0].sender_user[1]+' has sent new message.');
//                            }
//                        }
//                    }
//                }
//                else if(notif[1] && notif[1].rating){
//                    var order = self.pos.get_order();
//                    if(order){
//                        order.set_rating(notif[1].rating);
//                    }
//                } else if(notif[1] && notif[1].partner_id){
//                    var partner_id = notif[1].partner_id;
//                    var partner = self.pos.db.get_partner_by_id(partner_id);
//                    var order = self.pos.get_order();
//                    if(partner){
//                        if(order){
//                            order.set_client(partner);
//                        }
//                    }else{
//                        if(partner_id){
////                            var fields = _.find(self.pos.models,function(model){ return model.model === 'res.partner'; }).fields;
//                            var params = {
//                                model: 'res.partner',
//                                method: 'search_read',
////                                fields: fields,
//                                domain: [['id','=',partner_id]],
//                            }
//                            rpc.query(params, {async: false})
//                            .then(function(partner){
//                                if(partner && partner.length > 0){
//                                    self.pos.db.add_partners(partner);
//                                    order.set_client(partner[0]);
//                                }else{
//                                    self.pos.db.notification('danger',"Patient not loaded in POS.");
//                                }
//                            });
//                        }
//                    }
//                }else if(notif[1] && notif[1].new_pos_order){
//                    /*ORDER SYNC*/
//                    var previous_sale_note = self.pos.get('pos_order_list');
//                    if(notif[1].new_pos_order[0].state == "paid"){
//                            self.pos.db.notification('success',_t(notif[1].new_pos_order[0].display_name + ' order has been paid.'));
//                        } else{
//                            self.pos.db.notification('success',_t(notif[1].new_pos_order[0].display_name + ' order has been created.'));
//                        }
//                    previous_sale_note.push(notif[1].new_pos_order[0]);
//                    var obj = {};
//                    for ( var i=0, len=previous_sale_note.length; i < len; i++ ){
//                        obj[previous_sale_note[i]['id']] = previous_sale_note[i];
//                    }
//                    previous_sale_note = new Array();
//                    for ( var key in obj ){
//                         previous_sale_note.push(obj[key]);
//                    }
//                    previous_sale_note.sort(function(a, b) {
//                        return b.id - a.id;
//                    });
//                    self.pos.db.add_orders(previous_sale_note);
//                    self.pos.set({'pos_order_list':previous_sale_note});
//                    if(self && self.chrome && self.chrome.screens && self.chrome.screens.orderlist){
//                        self.pos.chrome.screens.orderlist.render_list(previous_sale_note);
//                    }
//                    self.render_sale_note_order_list(previous_sale_note);
//                }else if(notif[1] && notif[1].delivery_pos_order){
//                    var existing_orders = self.pos.get('pos_order_list');
//                    var filtered = _.filter(existing_orders, function(item) {
//                        return item.id !== notif[1].delivery_pos_order[0].id
//                    });
//                    filtered.push(notif[1].delivery_pos_order[0]);
//                    filtered = _.sortBy(filtered, 'id').reverse();
//                    self.pos.db.add_orders(filtered);
//                    self.pos.set({'pos_order_list':filtered});
//                    var delivery_orders = _.filter(self.pos.get('pos_order_list'), function(item) {
//                         return item.delivery_type == 'pending'
//                    });
//                    self.render_delivery_order_list(delivery_orders);
//                }
//            }
//        },
//        render_delivery_order_list: function(orders){
//            var self = this;
//            if(orders){
//                var contents = $('.message-panel-body2');
//                contents.html("");
//                var order_count = 0;
//                for(var i = 0, len = Math.min(orders.length,1000); i < len; i++){
//                    var order = orders[i];
//                    order_count ++;
//                    var orderlines = [];
//                    order.amount_total = parseFloat(order.amount_total).toFixed(2);
//                    var clientline_html = QWeb.render('DeliveryOrdersQuickWidgetLine',{widget: this, order:order, orderlines:orderlines});
//                    var clientline = document.createElement('tbody');
//                    clientline.innerHTML = clientline_html;
//                    clientline = clientline.childNodes[1];
//                    contents.append(clientline);
//                }
//                self.pos.delivery_order_count = order_count
////            	$('.notification-count').show();
//                $('.delivery_order_count').text(order_count);
//            }
//        },
//        pos_lock: function(){
//            var self = this;
//            self.pos.session_by_id = {};
//            var domain = [['state','=', 'opened'],['id','!=',self.pos.pos_session.id]];
//            var params = {
//                model: 'pos.session',
//                method: 'search_read',
//                domain: domain,
//            }
//            rpc.query(params, {async: false}).then(function(sessions){
//                if(sessions && sessions.length > 0){
//                    _.each(sessions,function(session){
//                        self.pos.session_by_id[session.id] = session;
//                    });
//                    self.pos.gui.show_popup('terminal_list',{'sessions':sessions});
//                } else{
//                    self.pos.db.notification('danger',_t('Active sessions not found!'));
//                }
//            }).fail(function(){
//                self.pos.db.notification('danger',"Connection lost");
//            });
//        },
//        messages_button: function(){
//            var self = this;
//            if($('#draggablePanelList').css('display') == 'none'){
//                $('#draggablePanelList').animate({
//                    height: 'toggle'
//                    }, 200, function() {
//                });
//                self.render_message_list(self.pos.message_list);
//                $('.panel-body').css({'height':'auto','max-height':'242px','min-height':'45px','overflow':'auto'});
//                $('.head_data').html(_t("Message"));
//                $('.panel-body').html("Message-Box Empty");
//            }else{
//                $('#draggablePanelList').animate({
//                    height: 'toggle'
//                    }, 200, function() {
//                });
//            }
//        },
//        close_draggable_panal:function(){
//            $('#draggablePanelList').animate({
//                height: 'toggle'
//                }, 200, function() {
//            });
//        },
//        delete_msg_history: function(){
//            var self = this;
//            var params = {
//                model: 'message.terminal',
//                method: 'delete_user_message',
//                args: [self.pos.pos_session.id],
//            }
//            rpc.query(params, {async: false}).then(function(result){
//                if(result){
//                    self.pos.message_list = []
//                    self.render_message_list(self.pos.message_list)
//                }
//            }).fail(function(){
//                self.pos.db.notification('danger',"Connection lost");
//            });
//        },
//        render_message_list: function(message_list){
//            var self = this;
//            if(message_list && message_list[0]){
//                var contents = $('.message-panel-body');
//                contents.html("");
//                var temp_str = "";
//                for(var i=0;i<message_list.length;i++){
//                    var message = message_list[i];
//                    var messageline_html = QWeb.render('MessageLine',{widget: this, message:message_list[i]});
//                    temp_str += messageline_html;
//                }
//                contents.html(temp_str)
//                $('.message-panel-body').scrollTop($('.message-panel-body')[0].scrollHeight);
//                $('#message_icon').css("color", "gray");
//            } else{
//                var contents = $('.message-panel-body');
//                contents.html("");
//            }
//        },
//        user_icon_url(id){
//            return '/web/image?model=res.users&id='+id+'&field=image_small';
//        },
//    });

    chrome.HeaderButtonWidget.include({
        renderElement: function(){
            var self = this;
            this._super();
            if(this.action){
                this.$el.click(function(){
                    self.gui.show_popup('POS_session_config');
                });
            }
        },
    });



});