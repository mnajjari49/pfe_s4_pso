# -*- coding: utf-8 -*-
# from odoo import http


# class KzmPosReports(http.Controller):
#     @http.route('/kzm_pos_reports/kzm_pos_reports/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/kzm_pos_reports/kzm_pos_reports/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('kzm_pos_reports.listing', {
#             'root': '/kzm_pos_reports/kzm_pos_reports',
#             'objects': http.request.env['kzm_pos_reports.kzm_pos_reports'].search([]),
#         })

#     @http.route('/kzm_pos_reports/kzm_pos_reports/objects/<model("kzm_pos_reports.kzm_pos_reports"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('kzm_pos_reports.object', {
#             'object': obj
#         })
