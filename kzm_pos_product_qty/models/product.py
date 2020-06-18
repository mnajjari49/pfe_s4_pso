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


class StockQuant(models.Model):
    _inherit = 'stock.quant'


    def get_stock_location_qty(self, location):
        res = {}
        product_ids = self.env['product.product'].search([])
        for product in product_ids:
            quants = self.env['stock.quant'].search \
                ([('product_id', '=', product.id) ,('location_id', '=', location['id'])])
            if len(quants) > 1:
                quantity = 0.0
                for quant in quants:
                    quantity += quant.quantity
                res.update({product.id : quantity})
            else:
                res.update({product.id : quants.quantity})
        return [res]

    def get_single_product(self ,product, location):
        res = []
        pro = self.env['product.product'].browse(product)
        quants = self.env['stock.quant'].search([('product_id', '=', pro.id) ,('location_id', '=', location['id'])])
        if len(quants) > 1:
            quantity = 0.0
            for quant in quants:
                quantity += quant.quantity
            res.append([pro.id, quantity])
        else:
            res.append([pro.id, quants.quantity])
        return res



class Product(models.Model):
    _inherit = 'product.product'

    available_quantity = fields.Float('Available Quantity')

    def get_stock_location_avail_qty(self, location):
        res = {}
        product_ids = self.env['product.product'].search([])
        for product in product_ids:
            quants = self.env['stock.quant'].search \
                ([('product_id', '=', product.id) ,('location_id', '=', location['id'])])
            outgoing = self.env['stock.move'].search \
                ([('product_id', '=', product.id) ,('location_id', '=', location['id'])])
            incoming = self.env['stock.move'].search \
                ([('product_id', '=', product.id) ,('location_dest_id', '=', location['id'])])
            qty =0.0
            product_qty = 0.0
            incoming_qty = 0.0
            if len(quants) > 1:
                for quant in quants:
                    qty += quant.quantity

                if len(outgoing) > 0:
                    for quant in outgoing:
                        if quant.state not in ['done']:
                            product_qty += quant.product_qty

                if len(incoming) > 0:
                    for quant in incoming:
                        if quant.state not in ['done']:
                            incoming_qty += quant.product_qty
                    product.available_quantity = qty -product_qty + incoming_qty
                    res.update({product.id : qty -product_qty + incoming_qty})
            else:
                if not quants:
                    if len(outgoing) > 0:
                        for quant in outgoing:
                            if quant.state not in ['done']:
                                product_qty += quant.product_qty

                    if len(incoming) > 0:
                        for quant in incoming:
                            if quant.state not in ['done']:
                                incoming_qty += quant.product_qty
                    product.available_quantity = qty -product_qty + incoming_qty
                    res.update({product.id : qty -product_qty + incoming_qty})
                else:
                    if len(outgoing) > 0:
                        for quant in outgoing:
                            if quant.state not in ['done']:
                                product_qty += quant.product_qty

                    if len(incoming) > 0:
                        for quant in incoming:
                            if quant.state not in ['done']:
                                incoming_qty += quant.product_qty
                    product.available_quantity = quants.quantity - product_qty + incoming_qty
                    res.update({product.id : quants.quantity - product_qty + incoming_qty})
        return [res]