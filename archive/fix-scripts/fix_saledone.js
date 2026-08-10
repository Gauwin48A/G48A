const fs = require('fs');
const p = 'C:/Users/laksh/GITHUB/1hub_rep2/G48A/android-native/app/src/main/java/com/mhub/app/ui/commerce/CommerceScreens.kt';
let content = fs.readFileSync(p, 'utf8');

// Fix the hero strings
content = content
  .replace(
    'Text("SALE VERIFICATION",',
    'Text(stringResource(R.string.commerce_sale_verification_label),'
  )
  .replace(
    'Text("Sale Confirmation", fontWeight = FontWeight.ExtraBold',
    'Text(stringResource(R.string.commerce_sale_confirmation_title), fontWeight = FontWeight.ExtraBold'
  )
  .replace(
    'Text("Confirm a sale with buyer OTP & transaction ID.",',
    'Text(stringResource(R.string.commerce_sale_confirmation_subtitle),'
  );

// Fix the badge listOf with mojibake/emoji chars - replace the entire listOf line
content = content.replace(
  /listOf\("[^"]*Secure[^"]*",\s*"[^"]*Rewarded[^"]*",\s*"[^"]*Verified[^"]*"\)\.forEach \{ badge ->/,
  `listOf(
                            stringResource(R.string.commerce_badge_secure),
                            stringResource(R.string.commerce_badge_rewarded),
                            stringResource(R.string.commerce_badge_verified),
                        ).forEach { badge ->`
);

fs.writeFileSync(p, content, 'utf8');
console.log('Done!');

// Verify
const lines = content.split('\n');
for (let i = 3048; i < 3068; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
