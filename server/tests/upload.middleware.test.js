const upload = require('../src/middleware/upload');

describe('upload middleware regression behavior', () => {
  it('fileFilter rejects malformed file metadata without throwing', (done) => {
    upload.fileFilter({}, {}, (err, accepted) => {
      try {
        expect(accepted).toBeUndefined();
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('Invalid file type');
        done();
      } catch (assertErr) {
        done(assertErr);
      }
    });
  });

  it('fileFilter accepts mixed-case MIME types', (done) => {
    upload.fileFilter({}, { mimetype: 'Image/PNG' }, (err, accepted) => {
      try {
        expect(err).toBeNull();
        expect(accepted).toBe(true);
        done();
      } catch (assertErr) {
        done(assertErr);
      }
    });
  });

  it('getImageUrl returns null for invalid input', () => {
    expect(upload.getImageUrl()).toBeNull();
    expect(upload.getImageUrl({})).toBeNull();
  });

  it('getImageUrl prioritizes remote url/path providers', () => {
    expect(upload.getImageUrl({ path: 'https://cdn.example.com/a.jpg', filename: 'x.jpg' }))
      .toBe('https://cdn.example.com/a.jpg');
    expect(upload.getImageUrl({ url: 'https://cdn.example.com/b.jpg', filename: 'x.jpg' }))
      .toBe('https://cdn.example.com/b.jpg');
    expect(upload.getImageUrl({ location: 'https://s3.example.com/c.jpg', filename: 'x.jpg' }))
      .toBe('https://s3.example.com/c.jpg');
  });

  it('getImageUrl falls back to local uploads path for filename', () => {
    expect(upload.getImageUrl({ filename: 'avatar.png' })).toBe('/uploads/avatar.png');
  });
});
