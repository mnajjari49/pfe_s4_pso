# -*- coding: utf-8 -*-
{
    'name': 'POS Customer display',
    'version': '1.0',
    'author': 'Karizma Conseil',
    'website': 'http://karizma-conseil.com',
    'summary': 'POS Customer display',
    'description': "Allow the display for customers",
    'category': 'Point Of Sale',
    'depends': [
        'base',
        'point_of_sale',
        'kzm_pos_config',
        'website',
        'bus',
    ],
    'data': [
        # 'data/cashier_compute_data.xml',
        'security/ir.model.access.csv',
        'views/templates.xml',
        'views/pos_view.xml',
        'views/customer_display.xml',
    ],
     'qweb': [
        'static/src/xml/customer_display.xml',
        'static/src/xml/pos.xml',
    ],
    'installable': True,
    'auto_install': False,
}
