const request = require('supertest');
const express = require('express');

describe('Server Health Check', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
    });

    it('should return 200 OK', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });
});
