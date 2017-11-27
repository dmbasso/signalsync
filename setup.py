#!/usr/bin/env python
# coding=utf-8

from setuptools import setup

setup(
    name='signalsync',
    version='0.1.0',
    description=(
        'Synchronization of independent signal recordings with time markings'
    ),
    url='http://github.com/dmbasso/signalsync',
    author='Daniel Monteiro Basso',
    author_email='daniel@basso.inf.br',
    license='AGPLv3',
    packages=['signalsync'],
    scripts=['bin/qr-claquet'],
    install_requires=['dtmf'],
)
