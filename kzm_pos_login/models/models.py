# -*- coding: utf-8 -*-

# from odoo import models, fields, api


# class kzm_pos_login(models.Model):
#     _name = 'kzm_pos_login.kzm_pos_login'
#     _description = 'kzm_pos_login.kzm_pos_login'

#     name = fields.Char()
#     value = fields.Integer()
#     value2 = fields.Float(compute="_value_pc", store=True)
#     description = fields.Text()
#
#     @api.depends('value')
#     def _value_pc(self):
#         for record in self:
#             record.value2 = float(record.value) / 100
