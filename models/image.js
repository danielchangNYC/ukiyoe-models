var async = require("async");
var mongoosastic = require("mongoosastic");
var versioner = require("mongoose-version");

module.exports = function(lib) {
    try {
        return lib.db.model("Image");
    } catch(e) {}

    var Name = require("./name")(lib);
    var YearRange = require("./yearrange")(lib);

    var ObjectId = lib.db.schema.Types.ObjectId;

    var ArtistRecordSchema = new lib.db.schema({
        artist: {type: ObjectId, ref: "Artist"},
        names: [Name]
    });

    ArtistRecordSchema.virtual("name")
        .get(function() {
            return this.names[0];
        })
        .set(function(name) {
            if (this.names[0]) {
                this.names[0].remove();
            }
            this.names.push(name);
        });

    var ImageSchema = new lib.db.schema({
        // UUID of the image (Format: SOURCE/IMAGEMD5)
        _id: String,

        // The print that this image is a part of
        print: {type: ObjectId, ref: "Print"},

        // The original extracted data
        extractedImage: {type: String, ref: "ExtractedImage"},

        // The date that this item was created
        created: {type: Date, "default": Date.now},

        // The date that this item was updated
        modified: {type: Date, es_indexed: true},

        // The source of the image.
        source: {type: String, ref: "Source", es_indexed: true},

        // The name of the downloaded image file
        // (e.g. SOURCE/images/IMAGENAME.jpg)
        imageName: String,

        // A unique ID for the image
        // (e.g. SOURCE/IMAGENAME)
        imageID: {type: String, es_indexed: true},

        // Full URL of the original page from where the image came.
        url: String,

        // A list of artist names extracted from the page.
        artists: {
            type: [ArtistRecordSchema],
            es_indexed: true
        },

        // The title of the print.
        title: {type: String, es_indexed: true},

        // A description of the contents of the print.
        description: {type: String, es_indexed: true},

        // Date when the print was created (typically a rough year, or range).
        dateCreateds: [YearRange],

        // Other images relating to the print (could be alternate views or
        // other images in a triptych, etc.
        related: [{type: String, ref: "Image"}],

        // Similar images (as determined by MatchEngine)
        similar: [{
            score: Number,
            target_overlap_percent: Number,
            query_overlap_percent: Number,
            overlay: String,
            image: {type: String, ref: "Image"}
        }]
    });

    ImageSchema.virtual("dateCreated")
        .get(function() {
            return this.dateCreateds[0];
        })
        .set(function(date) {
            if (this.dateCreateds[0]) {
                this.dateCreateds[0].remove();
            }
            if (date && typeof date !== "string") {
                this.dateCreateds.push(date);
            }
        });


    ImageSchema.methods = {
        getTitle: function(locale) {
            if (this.display_title) {
                return this.display_title;
            }

            var parts = [];

            if (this.artist) {
                parts.push(this.artist.getFullName(locale) + ":");
            }

            if (this.title && /\S/.test(this.title)) {
                parts.push(this.title);
            }

            if (this.source) {
                parts.push("-", this.source.getFullName(locale));
            }

            return parts.join(" ");
        },

        getURL: function(locale) {
            return site.genURL(locale, this.localURL);
        }
    };

    ImageSchema.plugin(mongoosastic);
    ImageSchema.plugin(versioner, {
        collection: "image_versions",
        suppressVersionIncrement: false,
        strategy: "collection",
        mongoose: lib.db.mongoose
    });

    return lib.db.model("Image", ImageSchema);
};