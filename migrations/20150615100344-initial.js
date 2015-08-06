var dbm = global.dbm || require('db-migrate');
var type = dbm.dataType;
var async = require('async')

exports.up = function(db, callback) {
    function postIdColumn(fkName) {
        return {
            type: 'int',
            notNull: true,
            foreignKey: {
                name: fkName,
                table: 'posts',
                rules: {
                    onDelete: 'RESTRICT',
                    onUpdate: 'RESTRICT'
                },
                mapping: {
                    postId: 'id'
                }
            }
        }
    }
    function removeCreatedAtAutoUpdate(tableName) {
        /**
         * Remove the automatic updating of the timestamped column "createdAt".
         *
         * http://stackoverflow.com/a/8131837/219947 and https://dev.mysql.com/doc/refman/5.0/en/timestamp-initialization.html
         */
        return db.runSql.bind(db, 'ALTER TABLE '+tableName+' MODIFY createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP')
    }
    async.series([
        db.createTable.bind(db, 'posts', {
            id: { type: 'int', primaryKey: true, notNull: true, autoIncrement: true },
            title: { type: 'string', notNull: true },
            createdAt: { type: 'timestamp', notNull: true},
            updatedAt: { type: 'timestamp', notNull: false },
            published: { type: 'binary', notNull: true },
            authorNickname: { type: 'string', notNull: true }
        }),
        removeCreatedAtAutoUpdate('posts'),
        db.addIndex.bind(db, 'posts', 'createdAt', ['createdAt']),
        db.addIndex.bind(db, 'posts', 'published', ['published']),

        db.createTable.bind(db, 'comments', {
            id: { type: 'int', primaryKey: true, notNull: true, autoIncrement: true },
            authorNickname: { type: 'string', notNull: true },
            comment: { type: 'text', notNull: true },
            createdAt: { type: 'timestamp', notNull: true},
            postId: postIdColumn('comments__post')
        }),
        removeCreatedAtAutoUpdate('comments'),
        db.addIndex.bind(db, 'comments', 'createdAt', ['createdAt']),
        db.addIndex.bind(db, 'comments', 'postId', ['postId']),

        db.createTable.bind(db, 'text_fragments', {
            id: { type: 'int', primaryKey: true, notNull: true, autoIncrement: true },
            fragmentOrdinal: { type: 'int', notNull: true },
            text: { type: 'text', notNull: true },
            createdAt: { type: 'timestamp', notNull: true},
            postId: postIdColumn('text_fragments__post')
        }),
        removeCreatedAtAutoUpdate('text_fragments'),
        db.addIndex.bind(db, 'text_fragments', 'postId', ['postId']),

        db.createTable.bind(db, 'image_fragments', {
            id: { type: 'int', primaryKey: true, notNull: true, autoIncrement: true },
            fragmentOrdinal: { type: 'int', notNull: true },
            imageOrdinal: { type: 'int', notNull: true },
            imageId: { type: 'string', notNull: true },
            width: { type: 'int', notNull: true },
            height: { type: 'int', notNull: true },
            exifOrientation: { type: 'int', notNull: false },
            createdAt: { type: 'timestamp', notNull: true},
            postId: postIdColumn('image_fragments__post')
        }),
        removeCreatedAtAutoUpdate('image_fragments'),
        db.addIndex.bind(db, 'image_fragments', 'postId', ['postId']),

        db.createTable.bind(db, 'youtube_fragments', {
            id: { type: 'int', primaryKey: true, notNull: true, autoIncrement: true },
            fragmentOrdinal: { type: 'int', notNull: true },
            youtubeId: { type: 'string', notNull: true },
            width: { type: 'int', notNull: true },
            height: { type: 'int', notNull: true },
            createdAt: { type: 'timestamp', notNull: true},
            postId: postIdColumn('youtube_fragments__post')
        }),
        removeCreatedAtAutoUpdate('youtube_fragments'),
        db.addIndex.bind(db, 'youtube_fragments', 'postId', ['postId'])
    ], callback)
};

exports.down = function(db, callback) {
    callback();
};
