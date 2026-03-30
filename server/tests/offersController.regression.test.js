function loadControllerWithPoolMock(queryImpl) {
    jest.resetModules();

    const query = jest.fn(queryImpl);
    const connect = jest.fn(async () => ({
        query: jest.fn(),
        release: jest.fn()
    }));
    const logger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    };

    jest.doMock('../src/config/db', () => ({ query, connect }));
    jest.doMock('../src/utils/logger', () => logger);

    const controller = require('../src/controllers/offersController');
    return { controller, query, connect, logger };
}

function createResponseMock() {
    const res = {
        status: jest.fn(),
        json: jest.fn()
    };
    res.status.mockReturnValue(res);
    return res;
}

describe('offersController regression behavior', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('getOffers falls back to created_at alias when offers.updated_at is missing', async () => {
        const now = '2026-02-28T00:00:00.000Z';
        const { controller, query } = loadControllerWithPoolMock(async ({ text }) => {
            if (text.includes('information_schema.columns')) {
                return { rows: [{ available: false }] };
            }
            return {
                rows: [{
                    total_count: 1,
                    offer_id: 'offer-1',
                    post_id: 'post-1',
                    buyer_id: 'buyer-1',
                    seller_id: 'seller-1',
                    offered_price: 90,
                    original_price: 100,
                    message: 'Can you do 90?',
                    status: 'pending',
                    counter_price: null,
                    created_at: now,
                    updated_at: now,
                    post_title: 'Phone',
                    post_images: [],
                    buyer_name: 'Buyer',
                    seller_name: 'Seller'
                }]
            };
        });

        const req = {
            user: { user_id: 'seller-1' },
            query: {}
        };
        const res = createResponseMock();

        await controller.getOffers(req, res);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            offers: [{
                offer_id: 'offer-1',
                post_id: 'post-1',
                buyer_id: 'buyer-1',
                seller_id: 'seller-1',
                offered_price: 90,
                original_price: 100,
                message: 'Can you do 90?',
                status: 'pending',
                counter_price: null,
                created_at: now,
                updated_at: now,
                post_title: 'Phone',
                post_images: [],
                buyer_name: 'Buyer',
                seller_name: 'Seller'
            }],
            total: 1,
            page: 1,
            limit: 50
        });

        const getOffersQueryText = query.mock.calls[1][0].text;
        expect(getOffersQueryText).toContain('o.created_at AS updated_at');
        expect(getOffersQueryText).not.toContain('o.updated_at');
    });

    it('createOffer returns updated_at alias from created_at when offers.updated_at is missing', async () => {
        const createdAt = '2026-02-28T00:00:00.000Z';
        const { controller, query } = loadControllerWithPoolMock(async ({ text }) => {
            if (text.includes('information_schema.columns')) {
                return { rows: [{ available: false }] };
            }
            if (text.includes('SELECT user_id, price, title FROM posts')) {
                return { rows: [{ user_id: 'seller-1', price: 120 }] };
            }
            if (text.includes('SELECT offer_id') && text.includes('FROM offers')) {
                return { rows: [] };
            }
            if (text.includes('INSERT INTO offers')) {
                return {
                    rows: [{
                        offer_id: 'offer-2',
                        post_id: 'post-1',
                        buyer_id: 'buyer-1',
                        seller_id: 'seller-1',
                        offered_price: 100,
                        original_price: 120,
                        message: 'Best I can do',
                        status: 'pending',
                        counter_price: null,
                        created_at: createdAt,
                        updated_at: createdAt
                    }]
                };
            }
            throw new Error(`Unexpected query: ${text}`);
        });

        const req = {
            user: { user_id: 'buyer-1' },
            body: {
                post_id: 'post-1',
                offer_amount: 100,
                message: 'Best I can do'
            }
        };
        const res = createResponseMock();

        await controller.createOffer(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Offer sent successfully',
            offer: {
                offer_id: 'offer-2',
                post_id: 'post-1',
                buyer_id: 'buyer-1',
                seller_id: 'seller-1',
                offered_price: 100,
                original_price: 120,
                message: 'Best I can do',
                status: 'pending',
                counter_price: null,
                created_at: createdAt,
                updated_at: createdAt
            }
        });

        const insertQueryText = query.mock.calls.find((call) => call[0].text.includes('INSERT INTO offers'))[0].text;
        expect(insertQueryText).toContain('created_at AS updated_at');
        expect(insertQueryText).not.toMatch(/,\s*updated_at\b/);
    });
});
