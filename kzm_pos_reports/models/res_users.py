# -*- coding: utf-8 -*-


from odoo import models, fields, api, _


class ResUsers(models.Model):
    _inherit = 'res.users'

    access_pos_graph = fields.Boolean("POS Graph", default=True)
    access_x_report = fields.Boolean("X-Report", default=True)
    access_today_sale_report = fields.Boolean("Today Sale Report", default=True)
    access_pos_dashboard = fields.Boolean("POS Sales Dashboard")
    access_product_expiry_report = fields.Boolean("Product Expiry Dashboard")
