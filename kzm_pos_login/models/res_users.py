

from odoo import models, fields, api, _


class ResUsers(models.Model):
    _inherit = 'res.users'

    login_with_pos_screen = fields.Boolean(string="Login with Direct POS", help='Use POS Screen for login')
    default_pos = fields.Many2one('pos.config', string="POS Config", help='Select the default POS you want login with')
    based_on = fields.Selection([('pin', 'Pin'), ('barcode', 'Barcode')], default='pin', string="Authentication Based On", help='Define the method for the login')
    pos_security_pin = fields.Char(string='POS Security Pin', size=32, help='A Security PIN used to protect sensible functionality in the Point of Sale')

    @api.model
    def get_user(self, username, password):
        print(username)
        print(password)
        user = self.env['res.users'].search([('login', '=', username), ('pos_security_pin', '=', password)])
        print(user)
        return user
    # ORDER SYC





# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
