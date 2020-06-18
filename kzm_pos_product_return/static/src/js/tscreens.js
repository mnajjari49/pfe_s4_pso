
odoo.define('kzm_pos_product_return.screen', function (require) {
    "use strict";

    var screens = require('point_of_sale.screens');
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');
    var core = require('web.core');
    var PosBaseWidget = require('point_of_sale.BaseWidget');

    var QWeb = core.qweb;
    var _t = core._t;

    models.load_models({
		model: 'pos.order',
		fields: ['name', 'id', 'date_order', 'partner_id', 'pos_reference', 'lines', 'amount_total','amount_tax','session_id', 'state', 'company_id'],
		loaded: function(self, orders){
			self.db.all_orders_list = orders;

			self.db.get_orders_by_id = {};
			orders.forEach(function(order) {
				self.db.get_orders_by_id[order.id] = order;
			});
			self.orders = orders;
		},
	});
	models.load_models({
		model: 'pos.order.line',
		fields: ['order_id', 'product_id', 'qty', 'price_unit'],
		domain: function(self) {
			var order_lines = []
			var orders = self.db.all_orders_list;
			for (var i = 0; i < orders.length; i++) {
				order_lines = order_lines.concat(orders[i]['lines']);
			}
			return [
				['id', 'in', order_lines]
			];
		},
		loaded: function(self, pos_order_line) {
			self.db.all_orders_line_list = pos_order_line;
			self.db.get_lines_by_id = {};
			pos_order_line.forEach(function(line) {
				self.db.get_lines_by_id[line.id] = line;
			});

			self.pos_order_line = pos_order_line;
		},
	});

    var SeeAllOrdersButtonWidget = screens.ActionButtonWidget.extend({
		template: 'SeeAllOrdersButtonWidget',

		button_click: function() {
			var self = this;
			this.gui.show_screen('see_all_orders_screen_widget', {});
		},

	});

	screens.define_action_button({
		'name': 'See All Orders Button Widget',
		'widget': SeeAllOrdersButtonWidget,
		'condition': function() {
			return true;
		},
	});

	screens.ProductScreenWidget.include({
        start: function(){
            var self = this;
            self._super();
            $('div#order_return').click(function(){
                self.gui.show_popup('PosReturnOrderOption');
            });

        },
        show: function(){
            this._super();
            var self = this;
            var order = this.pos.get_order();
            var partner = self.pos.config.default_partner_id;
//    		$('.breadcrumb-button.breadcrumb-home.js-category-switch').trigger('click');

        },
    });

    var SeeAllOrdersScreenWidget = screens.ScreenWidget.extend({
		template: 'SeeAllOrdersScreenWidget',
		init: function(parent, options) {
			this._super(parent, options);
			//this.options = {};
		},

		line_selects: function(event,$line,id){
			var self = this;
			var orders = this.pos.db.get_orders_by_id[id];
			this.$('.client-list .lowlight').removeClass('lowlight');
			if ( $line.hasClass('highlight') ){
				$line.removeClass('highlight');
				$line.addClass('lowlight');
				//this.display_orders_detail('hide',orders);
				//this.new_clients = null;
				//this.toggle_save_button();
			}else{
				this.$('.client-list .highlight').removeClass('highlight');
				$line.addClass('highlight');
				var y = event.pageY - $line.parent().offset().top;
				this.display_orders_detail('show',orders,y);
				//this.new_clients = orders;
				//this.toggle_save_button();
			}

		},

		display_orders_detail: function(visibility,order,clickpos){
			var self = this;
			var contents = this.$('.client-details-contents');
			var parent   = this.$('.orders-line ').parent();
			var scroll   = parent.scrollTop();
			var height   = contents.height();

			contents.off('click','.button.edit');
			contents.off('click','.button.save');
			contents.off('click','.button.undo');

			contents.on('click','.button.save',function(){ self.save_client_details(order); });
			contents.on('click','.button.undo',function(){ self.undo_client_details(order); });


			this.editing_client = false;
			this.uploaded_picture = null;

			if(visibility === 'show'){
				contents.empty();


				//Custom Code for passing the orderlines
				var orderline = [];
				for (var z = 0; z < order.lines.length; z++){
					orderline.push(self.pos.db.get_lines_by_id[order.lines[z]])
				}
				//Custom code ends

				contents.append($(QWeb.render('OrderDetails',{widget:this,order:order,orderline:orderline})));

				var new_height   = contents.height();

				if(!this.details_visible){
					if(clickpos < scroll + new_height + 20 ){
						parent.scrollTop( clickpos - 20 );
					}else{
						parent.scrollTop(parent.scrollTop() + new_height);
					}
				}else{
					parent.scrollTop(parent.scrollTop() - height + new_height);
				}

				this.details_visible = true;
				//this.toggle_save_button();
			 }

			 else if (visibility === 'edit') {
			// Connect the keyboard to the edited field
			if (this.pos.config.iface_vkeyboard && this.chrome.widget.keyboard) {
				contents.off('click', '.detail');
				searchbox.off('click');
				contents.on('click', '.detail', function(ev){
					self.chrome.widget.keyboard.connect(ev.target);
					self.chrome.widget.keyboard.show();
				});
				searchbox.on('click', function() {
					self.chrome.widget.keyboard.connect($(this));
				});
			}

			this.editing_client = true;
			contents.empty();
			contents.append($(QWeb.render('ClientDetailsEdit',{widget:this})));
			//this.toggle_save_button();

			// Browsers attempt to scroll invisible input elements
			// into view (eg. when hidden behind keyboard). They don't
			// seem to take into account that some elements are not
			// scrollable.
			contents.find('input').blur(function() {
				setTimeout(function() {
					self.$('.window').scrollTop(0);
				}, 0);
			});

			contents.find('.image-uploader').on('change',function(event){
				self.load_image_file(event.target.files[0],function(res){
					if (res) {
						contents.find('.client-picture img, .client-picture .fa').remove();
						contents.find('.client-picture').append("<img src='"+res+"'>");
						contents.find('.detail.picture').remove();
						self.uploaded_picture = res;
					}
				});
			});
			}



			 else if (visibility === 'hide') {
				contents.empty();
				if( height > scroll ){
					contents.css({height:height+'px'});
					contents.animate({height:0},400,function(){
						contents.css({height:''});
					});
				}else{
					parent.scrollTop( parent.scrollTop() - height);
				}
				this.details_visible = false;
				//this.toggle_save_button();
			}
		},

		get_selected_partner: function() {
			var self = this;
			if (self.gui)
				return self.gui.get_current_screen_param('selected_partner_id');
			else
				return undefined;
		},

		render_list_orders: function(orders, search_input){
			var self = this;
			var selected_partner_id = this.get_selected_partner();
			var selected_client_orders = [];
			if (selected_partner_id != undefined) {
				for (var i = 0; i < orders.length; i++) {
					if (orders[i].partner_id[0] == selected_partner_id)
						selected_client_orders = selected_client_orders.concat(orders[i]);
				}
				orders = selected_client_orders;
			}

		   if (search_input != undefined && search_input != '') {
				var selected_search_orders = [];
				var search_text = search_input.toLowerCase()
				for (var i = 0; i < orders.length; i++) {
					if (orders[i].partner_id == '') {
						orders[i].partner_id = [0, '-'];
					}
					if (((orders[i].name.toLowerCase()).indexOf(search_text) != -1) || ((orders[i].pos_reference.toLowerCase()).indexOf(search_text) != -1) || ((orders[i].partner_id[1].toLowerCase()).indexOf(search_text) != -1)) {
						selected_search_orders = selected_search_orders.concat(orders[i]);
					}
				}
				orders = selected_search_orders;
			}


			var content = this.$el[0].querySelector('.orders-list-contents');
			content.innerHTML = "";
			var orders = orders;
			for(var i = 0, len = Math.min(orders.length,1000); i < len; i++){
				var order    = orders[i];
				var ordersline_html = QWeb.render('OrdersLine',{widget: this, order:orders[i], selected_partner_id: orders[i].partner_id[0]});
				var ordersline = document.createElement('tbody');
				ordersline.innerHTML = ordersline_html;
				ordersline = ordersline.childNodes[1];
				content.appendChild(ordersline);

			}
		},

		save_client_details: function(partner) {
			var self = this;

			var fields = {};
			this.$('.client-details-contents .detail').each(function(idx,el){
				fields[el.name] = el.value || false;
			});

			if (!fields.name) {
				this.gui.show_popup('error',_t('A Customer Name Is Required'));
				return;
			}

			if (this.uploaded_picture) {
				fields.image = this.uploaded_picture;
			}

			fields.id           = partner.id || false;
			fields.country_id   = fields.country_id || false;

			//new Model('res.partner').call('create_from_ui',[fields])
			rpc.query({
				model: 'res.partner',
				method: 'create_from_ui',
				args: [fields],

				}).then(function(partner_id){
				self.saved_client_details(partner_id);
			},function(err,event){
				event.preventDefault();
				self.gui.show_popup('error',{
					'title': _t('Error: Could not Save Changes'),
					'body': _t('Your Internet connection is probably down.'),
				});
			});
		},

		undo_client_details: function(partner) {
			this.display_orders_detail('hide');

		},

		saved_client_details: function(partner_id){
			var self = this;
			self.display_orders_detail('hide');
			alert('!! Customer Created Successfully !!')

		},

		should_auto_print: function() {
			return this.pos.config.iface_print_auto && !this.pos.get_order()._printed;
		},


		show: function(options) {
			var self = this;
			this._super(options);

			this.details_visible = false;

			var orders = self.pos.db.all_orders_list;
			var orders_lines = self.pos.db.all_orders_line_list;
			this.render_list_orders(orders, undefined);

			this.$('.back').click(function(){
				self.gui.show_screen('products');
			});

			//################################################################################################################
			this.$('.orders-list-contents').delegate('.orders-line-name', 'click', function(event) {
			   for(var ord = 0; ord < orders.length; ord++){
				   if (orders[ord]['id'] == $(this).data('id')){
					var orders1 = orders[ord];
				   }
			   }
			   var orderline = [];
			   for(var n=0; n < orders_lines.length; n++){
				   if (orders_lines[n]['order_id'][0] == $(this).data('id')){
					orderline.push(orders_lines[n])
				   }
			   }
				self.gui.show_popup('see_order_details_popup_widget', {'order': [orders1], 'orderline':orderline});
			});

			//################################################################################################################

			//################################################################################################################
			this.$('.orders-list-contents').delegate('.orders-line-ref', 'click', function(event) {


			   for(var ord = 0; ord < orders.length; ord++){
				   if (orders[ord]['id'] == $(this).data('id')){
					var orders1 = orders[ord];
				   }
			   }
			   //var orders1 = self.pos.db.get_orders_by_id[parseInt($(this).data('id'))];

				var orderline = [];
				for(var n=0; n < orders_lines.length; n++){
					if (orders_lines[n]['order_id'][0] == $(this).data('id')){
					 orderline.push(orders_lines[n])
					}
				}

				//Custom Code for passing the orderlines
				//var orderline = [];
				//for (var z = 0; z < orders1.lines.length; z++){
					//orderline.push(self.pos.db.get_lines_by_id[orders1.lines[z]])
				//}
				//Custom code ends

				self.gui.show_popup('see_order_details_popup_widget', {'order': [orders1], 'orderline':orderline});


			   // self.line_selects(event, $(this), parseInt($(this).data('id')));
			});

			//################################################################################################################

			//################################################################################################################
			this.$('.orders-list-contents').delegate('.orders-line-partner', 'click', function(event) {


			   for(var ord = 0; ord < orders.length; ord++){
				   if (orders[ord]['id'] == $(this).data('id')){
					var orders1 = orders[ord];
				   }
			   }

			   //var orders1 = self.pos.db.get_orders_by_id[parseInt($(this).data('id'))];

				var orderline = [];
				for(var n=0; n < orders_lines.length; n++){
					if (orders_lines[n]['order_id'][0] == $(this).data('id')){
					 orderline.push(orders_lines[n])
					}
				}

				//Custom Code for passing the orderlines
				//var orderline = [];
				//for (var z = 0; z < orders1.lines.length; z++){
					//orderline.push(self.pos.db.get_lines_by_id[orders1.lines[z]])
				//}
				//Custom code ends

				self.gui.show_popup('see_order_details_popup_widget', {'order': [orders1], 'orderline':orderline});


			   // self.line_selects(event, $(this), parseInt($(this).data('id')));
			});

			//################################################################################################################

			//################################################################################################################
			this.$('.orders-list-contents').delegate('.orders-line-date', 'click', function(event) {

			   for(var ord = 0; ord < orders.length; ord++){
				   if (orders[ord]['id'] == $(this).data('id')){
					var orders1 = orders[ord];
				   }
			   }

			   //var orders1 = self.pos.db.get_orders_by_id[parseInt($(this).data('id'))];

				var orderline = [];
				for(var n=0; n < orders_lines.length; n++){
					if (orders_lines[n]['order_id'][0] == $(this).data('id')){
					 orderline.push(orders_lines[n])
					}
				}

				//Custom Code for passing the orderlines
				//var orderline = [];
				//for (var z = 0; z < orders1.lines.length; z++){
					//orderline.push(self.pos.db.get_lines_by_id[orders1.lines[z]])
				//}
				//Custom code ends

				self.gui.show_popup('see_order_details_popup_widget', {'order': [orders1], 'orderline':orderline});


			   // self.line_selects(event, $(this), parseInt($(this).data('id')));
			});

			//################################################################################################################

			//################################################################################################################
			this.$('.orders-list-contents').delegate('.orders-line-tot', 'click', function(event) {

			   for(var ord = 0; ord < orders.length; ord++){
				   if (orders[ord]['id'] == $(this).data('id')){
					var orders1 = orders[ord];
				   }
			   }

			   //var orders1 = self.pos.db.get_orders_by_id[parseInt($(this).data('id'))];

				var orderline = [];
				for(var n=0; n < orders_lines.length; n++){
					if (orders_lines[n]['order_id'][0] == $(this).data('id')){
					 orderline.push(orders_lines[n])
					}
				}


				//Custom Code for passing the orderlines
				//var orderline = [];
				//for (var z = 0; z < orders1.lines.length; z++){
					//orderline.push(self.pos.db.get_lines_by_id[orders1.lines[z]])
				//}
				//Custom code ends

				self.gui.show_popup('see_order_details_popup_widget', {'order': [orders1], 'orderline':orderline});


			   // self.line_selects(event, $(this), parseInt($(this).data('id')));
			});

			//################################################################################################################


			this.$('.orders-list-contents').delegate('.print-order', 'click', function(result) {
				var order_id = parseInt(this.id);
				var orderlines = [];
				var paymentlines = [];
				var discount = 0;
				var subtotal = 0;
				var tax = 0;
				var barcode;

				var selectedOrder = null;
				for(var i = 0, len = Math.min(orders.length,1000); i < len; i++) {
					if (orders[i] && orders[i].id == order_id) {
						selectedOrder = orders[i];
					}
				}

				rpc.query({
					model: 'pos.order',
					method: 'print_pos_receipt',
					args: [order_id],

				}).then(function(output) {
					orderlines = output[0];
					paymentlines = output[2];
					discount = output[1];
					subtotal = output[4];
					tax = output[5];
					barcode = output[6];
					self.pos.set({'reprint_barcode' : barcode});
					self.gui.show_screen('ReceiptScreenWidgetNew',{
						'widget':self,
						'order': selectedOrder,
						'paymentlines': paymentlines,
						'orderlines': orderlines,
						'discount_total': discount,
						'change': output[3],
						'subtotal': subtotal,
						'tax': tax,
						'barcode':barcode,
					});

				});
				return;
			});

			//Return Order
			this.$('.orders-list-contents').delegate('.return-order', 'click', function(result) {
				var order_id = parseInt(this.id);
				var selectedOrder = null;
				for(var i = 0, len = Math.min(orders.length,1000); i < len; i++) {
					if (orders[i] && orders[i].id == order_id) {
						selectedOrder = orders[i];
					}
				}

				var orderlines = [];
				var order_list = self.pos.db.all_orders_list;
				var order_line_data = self.pos.db.all_orders_line_list;

				selectedOrder.lines.forEach(function(line_id) {

					for(var y=0; y<order_line_data.length; y++){
						if(order_line_data[y]['id'] == line_id){
						   orderlines.push(order_line_data[y]);
						}
					}


					//var line = self.pos.db.get_lines_by_id[line_id];
					//var product = self.pos.db.get_product_by_id(line.product_id[0]);
					//orderlines.push(line);
				});

				self.gui.show_popup('pos_return_order_popup_widget', { 'orderlines': orderlines, 'order': selectedOrder });
			});
			//End Return Order


			this.$('.orders-list-contents').delegate('.re-order', 'click', function(result) {
				var order_id = parseInt(this.id);

				var selectedOrder = null;
				for(var i = 0, len = Math.min(orders.length,1000); i < len; i++) {
					if (orders[i] && orders[i].id == order_id) {
						selectedOrder = orders[i];
					}
				}

				var orderlines = [];
				var order_list = self.pos.db.all_orders_list;
				var order_line_data = self.pos.db.all_orders_line_list;

				selectedOrder.lines.forEach(function(line_id) {
					for(var y=0; y<order_line_data.length; y++){
						if(order_line_data[y]['id'] == line_id){
						   orderlines.push(order_line_data[y]);
						}
					}

				});

				self.gui.show_popup('pos_re_order_popup_widget', { 'orderlines': orderlines, 'order': selectedOrder });
			});
			//this code is for Search Orders
			this.$('.search-order input').keyup(function() {
				self.render_list_orders(orders, this.value);
			});

			this.$('.new-customer').click(function(){
				self.display_orders_detail('edit',{
					'country_id': self.pos.company.country_id,
				});
			});



		},
		//


	});
	gui.define_screen({
		name: 'see_all_orders_screen_widget',
		widget: SeeAllOrdersScreenWidget
	});







});
