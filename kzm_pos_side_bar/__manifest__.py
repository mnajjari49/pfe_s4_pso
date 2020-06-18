# -*- coding: utf-8 -*-
{
    'name': "POS Sidebar Menu",
    'summary': """Add side bar menu""",
    'description': """""",

    'author': "Karizma",
    'website': "http://www.karizma.ma",
    'category': 'Point of Sale',
    'version': '13.0',
    # any module necessary for this one to work correctly
    'depends': ['base', 'point_of_sale'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        # 'views/pos_config.xml',
        'views/templates.xml',
    ],
    'qweb': ['static/src/xml/*.xml'],
}