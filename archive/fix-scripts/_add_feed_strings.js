const fs = require('fs');
const path = 'android-native/app/src/main/res/values/strings.xml';
let xml = fs.readFileSync(path, 'utf8');

// Find the Feed screen section and add new strings after existing feed strings
const insertAfter = '<!-- Feed screen -->\n';

// Check if our new strings already exist
if (xml.includes('feed_knowledge_title')) {
  console.log('Feed strings already exist, skipping addition.');
  process.exit(0);
}

const feedStrings = `    <string name="feed_knowledge_title">Knowledge Feed</string>
    <string name="feed_knowledge_subtitle">Share and discover news &amp; knowledge</string>
    <string name="feed_hero_title">Knowledge &amp; News</string>
    <string name="feed_hero_subtitle">A space for sharing insights and community updates.</string>
    <string name="feed_composer_hint">Share some knowledge or news…</string>
    <string name="feed_read_more">Read more…</string>
    <string name="feed_show_less">Show less</string>
    <string name="feed_view_details">View Details</string>
    <string name="feed_share_via">Share via</string>
    <string name="feed_share_text_prefix">Check out this knowledge post: </string>
    <string name="feed_just_now">Just now</string>
    <string name="feed_min_ago">%dm ago</string>
    <string name="feed_hour_ago">%dh ago</string>
    <string name="feed_day_ago">%dd ago</string>
    <string name="feed_week_ago">%dw ago</string>
    <string name="feed_month_ago">%dmo ago</string>
    <string name="feed_year_ago">%dy ago</string>
    <string name="feed_empty_state_msg">New updates from users will appear here</string>
    <string name="feed_cd_create_post">Create post</string>
    <string name="feed_cd_search">Search</string>
    <string name="feed_cd_send">Send</string>
    <string name="feed_cd_like">Like</string>
    <string name="feed_cd_share">Share</string>

`;

// Insert after the <!-- Feed screen --> comment line
const idx = xml.indexOf(insertAfter);
if (idx === -1) {
  console.log('ERROR: Could not find Feed screen section');
  process.exit(1);
}
const insertPos = idx + insertAfter.length;

// Find the next section start after our insert point
const rest = xml.substring(insertPos);
const nextSection = rest.indexOf('\n    <!--');
const nextSectionEnd = nextSection > 0 ? rest.indexOf('-->', nextSection) : -1;
const actualInsertPos = nextSectionEnd > 0 ? insertPos + nextSectionEnd + 3 : insertPos;

// Insert right after the feed comment section
const before = xml.substring(0, actualInsertPos);
const after = xml.substring(actualInsertPos);
xml = before + '\n' + feedStrings + after;

fs.writeFileSync(path, xml, 'utf8');
console.log('FeedScreen string resources added successfully.');
