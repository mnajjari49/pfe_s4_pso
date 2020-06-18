odoo.define('kzm_pos_login.screens', function (require) {
    "use strict";

    var screens = require('point_of_sale.screens');
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');
    var core = require('web.core');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
//    var POSSessionConfig = require('kzm_pos_close.POSSessionConfig')

    var QWeb = core.qweb;
    var _t = core._t;

//    models.load_fields("res.users", ['login']);
    models.load_fields('pos.session',['is_lock_screen','current_cashier_id','locked','locked_by_user_id','shop_id']);
    var posmodel_super = models.PosModel.prototype;
    models.PosModel = models.PosModel.extend({
    start_timer: function(){
            var self = this;
            setInterval(function() {
                if(self.get_lock_status()){
                    if(self.get_lock_data() && self.get_lock_data().session_id[0] == self.pos_session.id){
                        $('#block_session_freeze_screen').addClass("active_state_freeze_screen");
                        $('.lock_screen_button').fadeIn(2000);
                        $('span.lock_screen_button').show();
                        $('#msg_lock').show();
                        $('#msg_lock').text("Your session has been blocked by "+self.get_lock_data().locked_by_user_id[1]);
                    } else{
                        $('#block_session_freeze_screen').removeClass("active_state_freeze_screen");
                        $('span.lock_screen_button').hide();
                        $('#msg_lock').hide();
                        $('#msg_lock').text('');
                    }
                } else{
                    $('#block_session_freeze_screen').removeClass("active_state_freeze_screen");
                    $('span.lock_screen_button').hide();
                    $('#msg_lock').hide();
                    $('#msg_lock').text('');
                }
            },2 * 1000);
        },
        set_lock_status:function(status){
            this.set('pos_block_status',status)
        },
        get_lock_status: function(){
            return this.get('pos_block_status')
        },
        set_lock_data: function(lock_data){
            this.set('pos_block_data',lock_data);
        },
        get_lock_data: function(){
            return this.get('pos_block_data');
        },
        set_title_detail_expire_screen:function(title){
            this.set('screen_title',title)
        },
        get_title_detail_expire_screen: function(){
            return this.get('screen_title');
        },
        // change the current order
//        set_order: function(order){
//            this.set({ selectedOrder: order });
//            var selectedOrder = this.get_order();
//            if(selectedOrder && selectedOrder.get_reservation_mode()){
//                selectedOrder.change_mode("reservation_mode");
//            } else {
//                selectedOrder.change_mode("sale");
//            }
//        },
        set_locked_user: function(locked_user){
            this.locked_user = locked_user;
        },
        get_locked_user: function(){
            return this.locked_user;
        },
        set_locked_screen: function(locked_screen){
            this.locked_screen = locked_screen;
        },
        get_locked_screen: function(){
            return this.locked_screen;
        },
        set_login_from: function(login_from){
            this.login_from = login_from;
        },
        get_login_from: function(){
            return this.login_from;
        },
    });
    models.PosModel.prototype.models.push({
        model:  'res.users',
        fields: [],
        loaded: function(self,users){
            self.users = users;
        },
    });

    function start_lock_timer(time_interval,self){
        var $area = $(document),
        idleActions = [{
            milliseconds: time_interval * 100000,
            action: function () {
                var params = {
                    model: 'pos.session',
                    method: 'write',
                    args: [self.pos.pos_session.id,{'is_lock_screen' : true}],
                }
                rpc.query(params, {async: false}).catch(function(){
                    self.pos.db.notification('danger',"Connection lost");
                });
                $('.freeze_screen').addClass("active_state");
                $(".unlock_button").fadeIn(2000);
                $('.unlock_button').show()
                $('.unlock_button').css('z-index',10000);
            }
        }];
        function lock (event, times, undefined) {
            var idleTimer = $area.data('idleTimer');
            if (times === undefined) times = 0;
            if (idleTimer) {
                clearTimeout($area.data('idleTimer'));
            }
            if (times < idleActions.length) {
                $area.data('idleTimer', setTimeout(function () {
                    idleActions[times].action();
                    lock(null, ++times);
                }, idleActions[times].milliseconds));
            } else {
                $area.off('mousemove click', lock);
            }
        };
        $area
            .data('idle', null)
            .on('mousemove click', lock);
        lock();
    }

    var LoginScreenWidgetCustom = screens.ScreenWidget.extend({
        template: 'LoginScreenWidgetCustom',
        init: function(parent, options){
            var self = this;
            this._super(parent, options);
        },
        start: function(){
            var self = this;
            this._super();
            $("input#username").focus();
            var selected_input;
            if ($("#login").is(":focus")) {
                selected_input = $("#login");
            }
            if ($("#password").is(":focus")) {
                selected_input = $("#password");
            }
            $("input").focus(function() {
                selected_input = $(this);
            });
            $('.number_pad_button').click(function() {
                var pres_char = $(this).html();
                if ($(this).hasClass("ac-clear-data")) {
                    selected_input.val("");
                } else if ($(this).hasClass("back-button")) {
                    selected_input.val(selected_input.val().slice(0, -1));
                } else if ($(this).hasClass("ac-submit-button")) {

                } else if ($(this).hasClass("login_space")) {
                    if(selected_input){
                        selected_input.val(selected_input.val() + " ");
                    }
                } else {
                    if(selected_input){
                        selected_input.val(selected_input.val() + "" + pres_char);
                    }
                }
            });
            $(".change_char").click(function() {
                $(".is_numpad").addClass("display_none");
                $(".is_charpad").removeClass("display_none");
                $(".is_smallcharpad").addClass("display_none")
                $(".change_num").removeClass("display_none");
                $(".change_char").addClass("display_none");
                $(".change_smallChar").removeClass("display_none");
            });
            $(".change_num").click(function() {
                $(".is_numpad").removeClass("display_none");
                $(".is_charpad").addClass("display_none");
                $(".is_smallcharpad").addClass("display_none")
                $(".change_num").addClass("display_none")
                $(".change_smallChar").addClass("display_none");
                $(".change_char").removeClass("display_none");
            });
            $(".change_smallChar").click(function() {
                if ($(".is_smallcharpad").hasClass("display_none")) {
                    $(".is_numpad").addClass("display_none");
                    $(".is_charpad").addClass("display_none");
                    $(".is_smallcharpad").removeClass("display_none");
                    $(".change_smallChar").removeClass("display_none");
                } else {
                    $(".is_charpad").removeClass("display_none");
                    $(".is_smallcharpad").addClass("display_none");
                }
            });
            $('input#password, input#username').keypress(function(e){
                if(e.keyCode == 13){
                    var username = $("input#username").val();
                    var password = $("input#password").val();
                    if(username && password){
                        self.login_user(username, password);
                    }else{
                        self.pos.db.notification('danger',_t('Please enter username and password'));
                    }
                }
            });
            $('#login').click(function(){
                var username = $("input#username").val();
                var password = $("input#password").val();

                if(username && password){
                    self.login_user(username, password);
                }else{
                    self.pos.db.notification('danger',_t('Please enter username and password'));
                }
            });
            $('.pos-login-rightheader').click(function(){
                self.pos.gui.close();
            });
        },
        get_company_image_url: function(){
            var company_id = this.pos.company.id;
            if(company_id){
                return window.location.origin + '/web/binary/company_logo?&company=' + company_id;
            }
        },
        login_user: function(username, password){
            var self = this;
            console.log(username)
            console.log(password)

//            var user = false;

//            var params = {
//                    model: 'res.users',
//                    method: 'get_user',
//                    args: [username, password],
//                }
//            rpc.query(params, {async: false}).then(function(result){
//                    user = result
//                    console.log(user)
//                }).catch(function(){
//                    self.pos.db.notification('danger',"Connection lost");
//            });

            console.log(self.pos.users)
            var user = _.find(self.pos.users, function(obj) { return obj.login == username && obj.pos_security_pin == password });

            if(user){
                $('.pos-topheader').show();
                self.pos.set_cashier(user);
                $('.pos-login-topheader').hide();
                self.chrome.widget.username.renderElement();
                if(self.pos.pos_session.opening_balance){
                    return self.gui.show_screen('openingbalancescreen');
                }
                self.gui.show_screen("products");
//                self.pos.chrome.slider_widget.renderElement();
                self.pos.set_login_from('login');
                if(self.pos.get_locked_screen()){
                    self.gui.show_screen(self.pos.get_locked_screen());
                }else{
                    self.gui.set_default_screen('products');
                }
                self.pos.set_locked_screen(false);
                self.pos.set_locked_user(false);
                if($('.show-left-cart').css('display') == 'block'){
                    $('.show-left-cart').hide();
                }
                self.pos.chrome.screens.products.order_widget.update_summary();
                var params = {
                    model: 'pos.session',
                    method: 'write',
                    args: [self.pos.pos_session.id,{'is_lock_screen' : false}],
                }
                rpc.query(params, {async: false}).then(function(result){
                    if(result){
                         $('.lock_button').css('background-color', '#eee');
                    }
                }).catch(function(){
                    self.pos.db.notification('danger',"Connection lost");
                });
                if(self.pos.config.enable_automatic_lock && self.pos.get_cashier().access_pos_lock){
                    start_lock_timer(self.pos.config.time_interval, self);
                }
            }else{
                self.pos.db.notification('danger',_t('Invalid Username or Pin!!!'));
            }
        },
        show: function(){
            var self = this;
            this._super();
            $("input#password").val('');
            $('.pos-topheader').hide();
            $("input#username").focus();
            $('.pos-login-topheader').show();
           /*if(self.pos.get_locked_user()){
               $("input#username").val(self.pos.get_locked_user());
               $("input#password").focus();
            }else{
               $("input#username").val('');
             }*/
        },
        close: function(){
            var self = this;
            this._super();
        },
    });
    gui.define_screen({name:'login', widget: LoginScreenWidgetCustom});

//    screens.LoginScreenWidget.include({
//
//    get_company_image_url: function(){
//            var company_id = this.pos.company.id;
//            if(company_id){
//                return window.location.origin + '/web/binary/company_logo?&company=' + company_id;
//            }
//        },
//
//    })



});