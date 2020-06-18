odoo.define('kzm_pos_reports.chrome', function (require) {
"use strict";
    console.log("===========")
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


    chrome.Chrome.include({


        build_widgets: function(){
            var self = this;
            this._super();

            self.slider_widget = new SliderWidget(this);
            self.slider_widget.replace(this.$('.placeholder-SliderWidget'));

        },

        close_draggable_panal:function(){
            $('#draggablePanelList').animate({
                height: 'toggle'
                }, 200, function() {
            });
        },

        user_icon_url(id){
            return '/web/image?model=res.users&id='+id+'&field=image_small';
        },
        save_receipt_for_reprint:function(){
            var self = this;
            var order = this.pos.get_order();
            var env = {
                widget:self,
                pos: this.pos,
                order: order,
                receipt: order.export_for_printing(),
                orderlines: order.get_orderlines(),
                paymentlines: order.get_paymentlines(),
            };
            var receipt_html = QWeb.render('PosTicket',env);
            order.set_pos_normal_receipt_html(receipt_html.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));
            var receipt = QWeb.render('XmlReceipt',env);
            order.set_pos_xml_receipt_html(receipt.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));
        },


    });
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


    var SliderWidget = PosBaseWidget.extend({
        template: 'SliderWidget',
        init: function(parent, options){
            var self = this;
            this._super(parent,options);
            self.sidebar_button_click = function(){
                if(self.gui.get_current_screen() !== "receipt"){
                    $(this).parent().removeClass('oe_hidden');
                    $(this).parent().toggleClass("toggled");
                    $(this).find('i').toggleClass('fa fa-chevron-right fa fa-chevron-left');
                }
            };
            self.pos_graph = function(){
                self.gui.show_screen('graph_view');
                self.close_sidebar();
            };
            self.x_report = function(){
                var pos_session_id = [self.pos.pos_session.id];
                self.pos.chrome.do_action('kzm_pos_reports.pos_x_report',{additional_context:{
                    active_ids:pos_session_id,
                }}).catch(function(){
                    self.pos.db.notification('danger',"Connection lost");
                });
                if(self.pos.config.iface_print_via_proxy){
                    var pos_session_id = self.pos.pos_session.id;
                    var report_name = "kzm_pos_reports.pos_x_thermal_report_template";
                    var params = {
                        model: 'ir.actions.report',
                        method: 'get_html_report',
                        args: [pos_session_id, report_name],
                    }
                    rpc.query(params, {async: false})
                    .then(function(report_html){
                        if(report_html && report_html[0]){
                            self.pos.proxy.print_receipt(report_html[0]);
                        }
                    });
                }
            };
            self.print_audit_report = function(){
                self.close_sidebar();
                self.gui.show_popup('report_popup');
            };
            self.payment_summary_report = function(){
                self.close_sidebar();
                self.gui.show_popup('payment_summary_report_wizard');
            };
            self.product_summary_report = function(){
                self.close_sidebar();
                self.gui.show_popup('product_summary_report_wizard');
            };
            self.order_summary_report = function(){
                self.close_sidebar();
                self.gui.show_popup('order_summary_popup');
            };
            self.today_sale_report = function(){
                self.close_sidebar();
                var str_payment = '';
                var params = {
                    model: 'pos.session',
                    method: 'get_session_report',
                    args: [],
                }
                rpc.query(params, {async: false}).then(function(result){
                    if(result['error']){
                        self.pos.db.notification('danger',result['error']);
                    }
                    if(result['payment_lst']){
                        var temp = [] ;
                        for(var i=0;i<result['payment_lst'].length;i++){
                            if(result['payment_lst'][i].session_name){
                                if(jQuery.inArray(result['payment_lst'][i].session_name,temp) != -1){
                                    str_payment+="<tr><td style='font-size: 14px;padding: 8px;'>"+result['payment_lst'][i].journals+"</td>" +
                                    "<td style='font-size: 14px;padding: 8px;'>"+self.format_currency(result['payment_lst'][i].total.toFixed(2))+"</td>" +
                                "</tr>";
                                }else{
                                    str_payment+="<tr><td style='font-size:14px;padding: 8px;' colspan='2'>"+result['payment_lst'][i].session_name+"</td></tr>"+
                                    "<td style='font-size: 14px;padding: 8px;'>"+result['payment_lst'][i].journals+"</td>" +
                                    "<td style='font-size: 14px;padding: 8px;'>"+self.format_currency(result['payment_lst'][i].total.toFixed(2))+"</td>" +
                                "</tr>";
                                temp.push(result['payment_lst'][i].session_name);
                                }
                            }
                        }
                    }
                    self.gui.show_popup('pos_today_sale',{result:result,str_payment:str_payment});
                }).catch(function(){
                    self.pos.db.notification('danger',"Connection lost");
                });
            };
            self.open_expiry_deshboard = function(){
                self.gui.show_screen('product_expiry_deshboard');
                self.close_sidebar();
            };
            self.open_sales_deshboard = function(){
                self.gui.show_screen('pos_dashboard_graph_view');
                self.close_sidebar();
            };

        },
        close_sidebar: function(){
            $("#wrapper").addClass('toggled');
            $('#wrapper').find('i').toggleClass('fa fa-chevron-left fa fa-chevron-right');
        },
        renderElement: function(){
            var self = this;
            self._super();
            self.el.querySelector('#slidemenubtn').addEventListener('click', self.sidebar_button_click);
            if(self.pos.config.product_expiry_report){
                self.el.querySelector('li.expiry_deshboard').addEventListener('click', self.open_expiry_deshboard);
            }
            if(self.pos.config.pos_dashboard){
                self.el.querySelector('li.sales_deshboard').addEventListener('click', self.open_sales_deshboard);
            }
            if(self.el.querySelector('li.pos-graph')){
                self.el.querySelector('li.pos-graph').addEventListener('click', self.pos_graph);
            }
            if(self.el.querySelector('li.x-report')){
                self.el.querySelector('li.x-report').addEventListener('click', self.x_report);
            }
            if(self.el.querySelector('li.today_sale_report')){
                self.el.querySelector('li.today_sale_report').addEventListener('click', self.today_sale_report);
            }
            if(self.el.querySelector('li.payment_summary_report')){
                self.el.querySelector('li.payment_summary_report').addEventListener('click', self.payment_summary_report);
            }
            if(self.el.querySelector('li.product_summary_report')){
                self.el.querySelector('li.product_summary_report').addEventListener('click', self.product_summary_report);
            }
            if(self.el.querySelector('li.order_summary_report')){
                self.el.querySelector('li.order_summary_report').addEventListener('click', self.order_summary_report);
            }
            if(self.el.querySelector('li.print_audit_report')){
                self.el.querySelector('li.print_audit_report').addEventListener('click', self.print_audit_report);
            }
            $('.main_slider-ul').click(function() {
                $(this).find('ul.content-list-ul').slideToggle();

            });
        },
    });



});