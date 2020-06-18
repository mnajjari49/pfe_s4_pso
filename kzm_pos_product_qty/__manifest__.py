# -*- coding: utf-8 -*-
{
    'name': "POS Product Qty",
    'summary': """To show products quantity in pos""",
    'description': """This module allow to display products quantity in POS sessions""",

    'author': "Karizma",
    'website': "http://www.karizma.ma",
    'category': 'Point of Sale',
    'version': '13.0',
    # any module necessary for this one to work correctly
    'depends': ['base', 'kzm_pos_side_bar', 'kzm_pos_config'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        'views/pos_config.xml',
        'views/templates.xml',
    ],
    'qweb': ['static/src/xml/*.xml'],
}