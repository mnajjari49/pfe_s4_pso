# -*- coding: utf-8 -*-
# from odoo import http


# class KzmPosConfig(http.Controller):
#     @http.route('/kzm_pos_config/kzm_pos_config/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/kzm_pos_config/kzm_pos_config/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('kzm_pos_config.listing', {
#             'root': '/kzm_pos_config/kzm_pos_config',
#             'objects': http.request.env['kzm_pos_config.kzm_pos_config'].search([]),
#         })

#     @http.route('/kzm_pos_config/kzm_pos_config/objects/<model("kzm_pos_config.kzm_pos_config"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('kzm_pos_config.object', {
#             'object': obj
#         })
