# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
import pytz
from pytz import timezone
from datetime import datetime, date, timedelta


class StockWarehouse(models.Model):
    _inherit = 'stock.warehouse'

    @api.model
    def disp_prod_stock(self, product_id):
        stock_line = []
        total_qty = 0
        shop_qty = 0
        quant_obj = self.env['stock.quant']
        for warehouse_id in self.search([]):
            product_qty = 0.0
            ware_record = warehouse_id
            location_id = ware_record.lot_stock_id.id
            # if shop_id:
            loc_ids1 = self.env['stock.location'].search([])
            stock_quant_ids1 = quant_obj.search([('location_id', 'in', [
                loc_id.id for loc_id in loc_ids1]), ('product_id', '=', product_id)])
            for stock_quant_id1 in stock_quant_ids1:
                shop_qty = stock_quant_id1.quantity

            loc_ids = self.env['stock.location'].search(
                [('location_id', 'child_of', [location_id])])
            stock_quant_ids = quant_obj.search([('location_id', 'in', [
                loc_id.id for loc_id in loc_ids]), ('product_id', '=', product_id)])
            for stock_quant_id in stock_quant_ids:
                product_qty += stock_quant_id.quantity
            stock_line.append([ware_record.name, product_qty, ware_record.lot_stock_id.id])
            total_qty += product_qty
            print(stock_line)
        return stock_line, total_qty, shop_qty