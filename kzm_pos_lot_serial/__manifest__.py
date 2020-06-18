# -*- coding: utf-8 -*-
{
    'name': "POS Lot and Serial",
    'summary': """Enter or Exit cash from POS Box""",
    'description': """This module allow to set multiples serial/Lot on products""",

    'author': "Karizma",
    'website': "http://www.karizma.ma",
    'category': 'Point of Sale',
    'version': '13.0',
    # any module necessary for this one to work correctly
    'depends': ['base', 'kzm_pos_product_qty', 'product_expiry'],
    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/pos_config.xml',
        'views/templates.xml',
    ],
    'qweb': ['static/src/xml/*.xml'],
}