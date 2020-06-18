# -*- coding: utf-8 -*-


from odoo import models, fields, api, tools, _
from datetime import datetime, date, time, timedelta
from dateutil.relativedelta import relativedelta
from odoo.exceptions import UserError, ValidationError, Warning
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT
from odoo.addons.account.wizard.pos_box import CashBox
import time
import pytz
from pytz import timezone
from odoo.tools import float_is_zero
import logging
import psycopg2
from odoo import SUPERUSER_ID
from operator import itemgetter
from timeit import itertools

_logger = logging.getLogger(__name__)


class PosConfig(models.Model):
    _inherit = 'pos.config'

    money_in_out = fields.Boolean("Money In/Out", help="Activate the entrance and the exit of money of the checkout")
    money_in_out_receipt = fields.Boolean("Money In/Out Receipt", help='Allow you to print a receipt for the operation')


class PosSession(models.Model):
    _inherit = 'pos.session'

    @api.model
    def cash_in_out_operation(self, vals):
        cash_obj = self.env['cash.box.out']
        amount = 0
        if vals:
            if vals.get('operation') == "put_money":
                amount = float(vals.get('amount'))
            elif vals.get('operation') == "take_money":
                amount = -float(vals.get('amount'))

        print('==========================================')
        print(amount)
        session_id = self.env['pos.session'].browse(vals.get('session_id'))
        if session_id:
            bank_statements = False
            for session in session_id:
                bank_statements = [session.cash_register_id for session in session_id if session.cash_register_id]
            if not bank_statements:
                return {'error': _('There is no cash register for this PoS Session')}
            cntx = {'active_id': session_id.id, 'uid': vals.get('cashier')}
            res = cash_obj.with_context(cntx).create({'name': vals.get('name'), 'amount': amount})
            return res._run(bank_statements)
        return {'error': _('There is no cash register for this PoS Session')}


class CashControl(models.Model):
    _name = 'custom.cashcontrol'
    _description = 'Used to Store Cash Conrtol Data.'

    coin_value = fields.Float(string="Coin/Bill Value")
    number_of_coins = fields.Integer(string="Number of Coins")
    subtotal = fields.Float(string="Subtotal")
    pos_session_id = fields.Many2one(comodel_name='pos.session', string="Session Id")


class CashInOutHistory(models.Model):
    _name = 'cash.in.out.history'
    _description = 'Used to Store Cash In-Out History.'

    user_id = fields.Many2one('res.users', string='User ID')
    session_id = fields.Many2one('pos.session', String="Session ID")
    amount = fields.Float("Amount")
    operation = fields.Selection([('Dr', 'Sortie'), ('Cr', 'Entrée')], string="Operation")


# Put money in from backend
# class PosBoxIn(CashBox):
#     _inherit = 'cash.box.in'
#
#     @api.model
#     def create(self, vals):
#         res = super(PosBoxIn, self).create(vals)
#         cash_out_obj_history = self.env['cash.in.out.history']
#         if res and self._context:
#             user_id = self._context.get('uid')
#             session_record_id = self._context.get('active_id')
#             history_val = {'user_id': user_id, 'session_id': session_record_id, 'amount': vals.get('amount'),
#                            'operation': 'Cr'}
#             cash_out_obj_history.create(history_val)
#         return res


# Take money out from backend
class PosBoxOut(CashBox):
    _inherit = 'cash.box.out'

    @api.model
    def create(self, vals):
        res = super(PosBoxOut, self).create(vals)
        print(res.amount)
        cash_out_obj_history = self.env['cash.in.out.history']
        if res and self._context:
            user_id = self._context.get('uid')
            if not user_id:
                raise UserError("You must have a user count")
            session_record_id = self._context.get('active_id')
            print(res.amount)
            history_val = {'user_id': user_id, 'session_id': session_record_id, 'amount': res.amount,}
            history_val['operation'] = 'Dr' if res.amount < 0 else 'Cr'
            print('=======================================================')
            print(history_val['operation'])
            cash_out_obj_history.create(history_val)
        return res
