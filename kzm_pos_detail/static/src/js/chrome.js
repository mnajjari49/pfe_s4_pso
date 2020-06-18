odoo.define('kzm_pos_detail.chrome', function (require) {
"use strict";
    console.log("========")
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
            /*if(!self.pos.load_background){
                self.$el.find('#product_sync').trigger('click');
            }*/
          //  self.slider_widget = new SliderWidget(this);
            self.pos_cart_widget = new PosCartCountWidget(this);
           // self.slider_widget.replace(this.$('.placeholder-SliderWidget'));
            self.pos_cart_widget.replace(this.$('.placeholder-PosCartCountWidget'));

        },

        user_icon_url(id){
            return '/web/image?model=res.users&id='+id+'&field=image_small';
        },
    });
    var PosCartCountWidget = PosBaseWidget.extend({
        template: 'PosCartCountWidget',
        init: function(parent, options){
            var self = this;
            this._super(parent,options);
            self.show_cart = function(){
            var order = self.pos.get_order();
         if (!order.get_orderlines().length) {
                $('.cart-num').text(0);
                return
            }else{
                var qty = 0;
                order.get_orderlines().map(function(line){
                    if(($.inArray(line.product.id) == -1)){
                        qty += line.get_quantity();
                    }
                });
                $('.cart-num').text(qty);
            }

                if(order.is_empty()) {
                    return;
                }
                if(self.gui.get_current_screen() != 'products'){
                    var html_data = $('.order-scroller').html();
                    $('.show-left-cart').html('').append(html_data);
                    $('.show-left-cart').toggle("slide");
                }
            };
        },
          /* update_summary: function(){
            var self = this;
            var order = self.pos.get_order();
            self._super();
            if (!order.get_orderlines().length) {
                $('.cart-num').text(0);
                return
            }else{
                var qty = 0;
                order.get_orderlines().map(function(line){
                    if(($.inArray(line.product.id, order.get_dummy_product_ids()) == -1)){
                        qty += line.get_quantity();
                    }
                });
                $('.cart-num').text(qty);
            }
        },*/
        renderElement: function(){
            var self = this;
            self._super();
            $(".pos-cart-info").delegate( "#pos-cart", "click",self.show_cart);
        },
    });

});