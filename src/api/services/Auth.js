'use strict';

module.exports = class Auth {
    check = (req, res) => {
        if (!req.headers.authorization) {
            return res.status(403).json({
                success: false,
                reason: 'no auth token provided'
            });
        }

        // hardcoded for assignment only!
        const user = 'test';
        const password = 'test';
        let providedCreds = Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString().split(':');
        const derivedUser = providedCreds[0];
        const derivedPassword = providedCreds[1];

        if (derivedUser !== user || derivedPassword !== password) {
            return res.status(401).json({
                success: false,
                reason: 'username or password wrong'
            });
        }

        return res.status(200).json({
            success: true
        });
    }
};