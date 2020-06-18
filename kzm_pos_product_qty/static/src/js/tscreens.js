



odoo.define('kzm_pos_product_qty.screen', function (require) {
    "use strict";


    var screens = require('point_of_sale.screens');
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');
    var core = require('web.core');
    var PosBaseWidget = require('point_of_sale.BaseWidget');

    var QWeb = core.qweb;
    var _t = core._t;


    screens.ProductListWidget.include({
        init: function(parent, options) {
            var self = this;
            this._super(parent,options);
            this.model = options.model;
            this.productwidgets = [];
            this.weight = options.weight || 0;
            this.show_scale = options.show_scale || false;
            this.next_screen = options.next_screen || false;
            this.click_product_handler = function(e){
                var product = self.pos.db.get_product_by_id(this.dataset.productId);
                if(product){
                    if(self.pos.config.auto_close){
                        $('#slidemenubtn1').css({'right':'0px'});
                        $('.product-list-container').css('width','100%');
                        $('#wrapper1').addClass('toggled');
                    }
                    if($(e.target).attr('class') === "product-qty-low" || $(e.target).attr('class') === "product-qty"){
                        var prod = product;
                        var prod_info = [];
                        var total_qty = 0;
                        rpc.query({
                            model: 'stock.warehouse',
                            method: 'disp_prod_stock',
                            args: [
                                 prod.id,self.pos.shop.id
                            ]
                        }).then(function(result){
                        if(result){
                            prod_info = [];
                            total_qty = 0;
                            _.each(result[0],function(item){
                                if(item[2] != self.pos.config.stock_location_id[0] && item[1] > 0){
                                    prod_info.push(item)
                                    total_qty += item[1]
                                }
                            });
                            if(total_qty > 0){
                                 $("[data-product-id='"+product.id+"']").find('.total_qty').html(product.qty_available)
                                 self.gui.show_popup('product_qty_advance_popup',{prod_info_data:prod_info,total_qty: total_qty,product: product});
                            }
                        }
                        }).catch(function (error, event){
                            if(error.code === -32098) {
                                self.pos.db.notification('danger',_t("Server Down..."));
                                event.preventDefault();
                           }
                        });
                    }else{
                        // options.click_product_action(product);
                        if (product.product_variant_count && product.product_variant_count > 1) {
                            // Normal behaviour, The template has only one variant
                            self.gui.show_screen('select_variant_screen',{product_tmpl_id:product.product_tmpl_id});
                        }
                        else{
                            // Display for selection all the variants of a template
                            options.click_product_action(product);
        //                     self.pos.pos_widget.screen_selector.show_popup('select-variant-popup', product.product_tmpl_id);
                        }
                    }
                }
            };
            this.product_list = options.product_list || [];
            this.product_cache = new screens.DomCache();
        },
        render_product: function(product){
            self = this;
            if (product.product_variant_count == 1){
                // Normal Display
                return this._super(product);
            }
            else{
                var cached = this.product_cache.get_node(product.id);
                if(!cached){
                    var image_url = this.get_product_image_url(product);
                    var product_html = QWeb.render('Product',{
                            widget:  this,
                            product: product,
                            image_url: this.get_product_image_url(product),
                        });
                    var product_node = document.createElement('div');
                    product_node.innerHTML = product_html;
                    product_node = product_node.childNodes[1];
                    this.product_cache.cache_node(product.id,product_node);
                    return product_node;
                }
                return cached;
            }
        },

    });

    screens.ProductScreenWidget.include({
        start: function(){
            var self = this;
            self._super();
            $('div#product_qty').click(function(){
                var order = self.pos.get_order();
                var lines = order.get_orderlines();
                var orderLines = [];
                var length = order.orderlines.length;
                if(lines.length <= 0){
                    $('div.order-empty').animate({
                        color: '#FFCCCC',
                    }, 1000, 'linear', function() {
                          $(this).css('color','#DDD');
                    });
                }
                if(order.get_selected_orderline()){
                    var prod = order.get_selected_orderline().get_product();
                    var prod_info = [];
                    var total_qty = 0;
                    var params = {
                        model: 'stock.warehouse',
                        method: 'disp_prod_stock',
                        args: [prod.id],
                    }
                    rpc.query(params, {async: false}).then(function(result){
                        if(result){
                            prod_info = result[0];
                            total_qty = result[1];
                            var prod_info_data = "";
                            _.each(prod_info, function (i) {
                                prod_info_data += "<tr>"+
                                "<td style='color:gray;font-weight: initial !important;padding:5px;text-align: left;padding-left: 15px;'>"+i[0]+"</td>"+
                                "<td style='color:gray;font-weight: initial !important;padding:5px;text-align: right;padding-right: 15px;'>"+i[1]+"</td>"+
                                "</tr>"
                            });
                            if(lines.length > 0){
                                self.gui.show_popup('product_qty_popup',{prod_info_data:prod_info_data,total_qty: total_qty});
                            }
                        }
                    }).catch(function(){
//                        self.pos.db.notification('danger',"Connection lost");

                    });
                }
            });
        },
		show: function() {
		    var self = this;
			this._super();
//			$('.product-list-container').css('width','100%');
			var products = self.pos.chrome.screens.products;
		},
    });






});
