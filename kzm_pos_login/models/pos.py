# -*- coding: utf-8 -*-

from odoo import models, fields, api, _


class PosSession(models.Model):
    _inherit = 'pos.session'

    current_cashier_id = fields.Many2one('res.users', string="Cashier", readonly=True)
    locked = fields.Boolean("Locked")
    locked_by_user_id = fields.Many2one('res.users', string="Locked By")
    is_lock_screen = fields.Boolean(string="Lock Screen")
    shop_id = fields.Many2one('pos.shop', string='Shop')

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
