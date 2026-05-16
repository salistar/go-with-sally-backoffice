# GoWithSally Google Play Store Submission Checklist

**Last Updated:** 2026-03-18
**Status:** Pre-Submission
**Version:** 1.0.0

---

## Pre-Submission Checklist

### 1. App Registration & Account Setup
- [ ] Google Play Developer Account created
- [ ] Store listing created in Play Console
- [ ] App category selected (Rideshare)
- [ ] Content rating questionnaire completed
- [ ] Privacy policy URL configured
- [ ] Support email address configured
- [ ] Contact information verified
- [ ] Payment account setup (if offering in-app purchases)

### 2. App Metadata & Listing

#### Basic Information
- [ ] App name: "Go With Sally"
- [ ] Short description (80 characters max) complete
- [ ] Full description (4000 characters max) complete
- [ ] Subtitle configured (80 characters max)
- [ ] Tagline configured (40 characters max)
- [ ] App category: Travel or Rideshare
- [ ] Content rating: [TO BE DETERMINED]

#### Graphics & Branding
- [ ] App icon (512x512 PNG) created and uploaded
  - No rounded corners
  - No transparency
  - Clear, distinct design
- [ ] Feature graphic (1024x500) created and uploaded
  - Highlights key features
  - Shows women-only focus
  - Professional design
- [ ] Screenshots (2-8) created (1080x1920 or 1440x2560)
  - Screenshot 1: Login screen
  - Screenshot 2: Ride booking
  - Screenshot 3: Safety features
  - Screenshot 4: SOS button
  - Screenshot 5: Ratings system
  - Screenshot 6: Payment options
  - Screenshot 7: Biometric verification
  - Screenshot 8: Customer support
- [ ] Short promo video (15-30 seconds) created (optional but recommended)

#### Descriptions
- [ ] French description (description_fr.txt) complete
- [ ] Arabic description (description_ar.txt) complete
- [ ] English description (app store description) complete
- [ ] Release notes written for version 1.0.0

### 3. Technical Requirements

#### App Configuration
- [ ] Minimum SDK version: 24 (Android 7.0)
- [ ] Target SDK version: 34 (Android 14)
- [ ] Supported architectures: arm64-v8a, armeabi-v7a
- [ ] 64-bit compilation enabled
- [ ] App bundle (AAB) generated
- [ ] App signing certificate configured

#### App Build
- [ ] APK/AAB built with release configuration
- [ ] No debug symbols in production build
- [ ] All crash logs reviewed and fixed
- [ ] Performance tested on low-end devices
- [ ] Battery usage optimized
- [ ] Memory leaks tested and eliminated

### 4. Privacy & Compliance

#### Privacy Policy
- [ ] Privacy policy written and hosted
- [ ] Privacy policy URL in Play Console
- [ ] Covers:
  - [ ] Data collection practices
  - [ ] User location tracking
  - [ ] Biometric data usage
  - [ ] Emergency contact data
  - [ ] Data retention policy
  - [ ] User rights and deletion
  - [ ] Third-party services
  - [ ] GDPR compliance (for EU users)

#### Permissions
- [ ] All requested permissions justified
- [ ] Biometric permission (face recognition)
- [ ] Location permission (GPS tracking)
- [ ] Camera permission (ID verification)
- [ ] Contact permission (emergency contacts)
- [ ] Phone permission (calls/SMS)
- [ ] Notification permission
- [ ] All permissions have clear user explanations

#### Age Appropriateness
- [ ] Content rating submitted
- [ ] Violence: Assessed
- [ ] Sexual content: Assessed
- [ ] Language: Assessed
- [ ] Alcohol/tobacco: Assessed
- [ ] Gambling: Assessed
- [ ] Content rating finalized

### 5. Safety & Security Features

#### Security Implementation
- [ ] All API endpoints using HTTPS
- [ ] Certificate pinning implemented
- [ ] Sensitive data encrypted
- [ ] No hardcoded secrets in app
- [ ] Security Headers configured
- [ ] CSRF protection enabled
- [ ] SQL injection prevention implemented

#### Biometric Security
- [ ] Face detection working correctly
- [ ] Anti-spoofing enabled
- [ ] Biometric data encrypted
- [ ] Biometric permission properly requested
- [ ] Face recognition trained on diverse datasets

#### User Safety Features
- [ ] SOS button fully functional
- [ ] Location sharing working
- [ ] Emergency contact alerts sent
- [ ] Chat history encrypted
- [ ] Profile verification complete
- [ ] Driver background checks documented
- [ ] Safety rating system implemented

### 6. Testing

#### Functional Testing
- [ ] Login/authentication works
- [ ] Ride booking flow complete
- [ ] Payment processing tested
- [ ] SOS button triggers properly
- [ ] Location tracking accurate
- [ ] Chat functionality working
- [ ] Ratings system functional
- [ ] Profile management working
- [ ] Push notifications delivered

#### Device Testing
- [ ] Tested on Android 7.0 (minimum)
- [ ] Tested on Android 14 (latest)
- [ ] Tested on various screen sizes:
  - [ ] 4.5-inch phone
  - [ ] 5.5-inch phone
  - [ ] 6.5-inch phone
  - [ ] 7-inch tablet
- [ ] Tested on low-end device (e.g., Moto G)
- [ ] Tested on high-end device (e.g., Pixel)

#### Performance Testing
- [ ] App startup time < 3 seconds
- [ ] Ride search response time < 2 seconds
- [ ] Battery drain acceptable (< 10% per hour)
- [ ] Data usage reasonable
- [ ] Network handling (offline, slow networks)
- [ ] Memory usage < 150MB
- [ ] Crash-free rating > 99%

#### Accessibility Testing
- [ ] Screen reader compatibility (TalkBack)
- [ ] Touch target sizes appropriate (48dp minimum)
- [ ] Color contrast sufficient (4.5:1 minimum)
- [ ] Font sizes readable
- [ ] No flashing content (>3 flashes per second)
- [ ] Keyboard navigation possible
- [ ] Alternative text for images

#### Security Testing
- [ ] SQL injection attempts blocked
- [ ] Cross-site scripting prevented
- [ ] Man-in-the-middle attacks prevented
- [ ] Credentials not exposed in logs
- [ ] Session hijacking prevented
- [ ] HTTPS certificate validation working

### 7. Compliance & Legal

#### Store Policies
- [ ] Google Play Developer Program Policies reviewed
- [ ] Content policies verified
- [ ] Rideshare policies understood
- [ ] User data handling complies
- [ ] Deceptive practices avoided
- [ ] Intellectual property respected
- [ ] No misleading claims

#### Regional Compliance
- [ ] Morocco-specific regulations reviewed
- [ ] Women's safety regulations compliant
- [ ] Consumer protection laws followed
- [ ] Payment method regulations met
- [ ] Data localization requirements (if any)
- [ ] Language requirements met

#### Third-Party Services
- [ ] Google Play Services integrated
- [ ] Firebase permissions granted
- [ ] Stripe payment SDK licensed
- [ ] Sentry error tracking compliant
- [ ] All SDKs up-to-date
- [ ] No prohibited libraries used

### 8. Localization

#### Language Support
- [ ] Arabic interface fully implemented
- [ ] French interface fully implemented
- [ ] English interface fully implemented
- [ ] Right-to-left (RTL) layout for Arabic
- [ ] Date/time formats localized
- [ ] Currency localized (Moroccan Dirham)
- [ ] Phone number format localized

#### Content Localization
- [ ] All strings in string resources
- [ ] No hardcoded text
- [ ] Translations reviewed by native speakers
- [ ] Culturally appropriate content
- [ ] Regional features implemented

### 9. Marketing Materials

#### Store Listing Assets
- [ ] Feature graphic (1024x500) created
- [ ] Promotional images prepared
- [ ] Demo video (30 seconds) ready
- [ ] Marketing copy compelling
- [ ] Highlighting unique features
- [ ] Addressing target audience (women)
- [ ] Emphasizing safety features

#### Pre-Launch Marketing
- [ ] Social media accounts prepared
- [ ] Press release ready
- [ ] Media contacts identified
- [ ] Influencer outreach planned
- [ ] Beta testing plan (if applicable)

### 10. Final Checks

#### Code Quality
- [ ] Code review completed
- [ ] Static analysis (lint) passed
- [ ] No critical warnings
- [ ] Coding standards followed
- [ ] Comments added for complex code
- [ ] Documentation complete

#### App Store Listing Review
- [ ] All fields double-checked
- [ ] Screenshots reviewed
- [ ] Descriptions proof-read
- [ ] No spelling errors
- [ ] No grammar errors
- [ ] Tone appropriate

#### Build & Release
- [ ] Build version incremented
- [ ] Release notes written
- [ ] Changelog prepared
- [ ] Versioning follows semantic versioning
- [ ] APK/AAB signed with release key
- [ ] Build reproducible

---

## Submission Checklist

### Pre-Submission
- [ ] All checklist items above completed
- [ ] Final review by team completed
- [ ] Legal team approval obtained
- [ ] Marketing team approval obtained
- [ ] Product team approval obtained

### Submission Process
- [ ] Navigate to Play Console
- [ ] Select app: Go With Sally
- [ ] Click "Create new release"
- [ ] Select release track: Internal Testing (first)
- [ ] Upload AAB file
- [ ] Review changes
- [ ] Complete release form
- [ ] Accept terms and conditions
- [ ] Submit for review

### Post-Submission
- [ ] Monitor review status
- [ ] Check for review feedback
- [ ] Address any issues immediately
- [ ] Prepare update if rejections occur
- [ ] Plan rollout strategy
- [ ] Prepare marketing for launch

---

## Review & Approval Guidelines

### Expected Review Time
- Internal testing: 1-2 hours
- Closed testing: 1-2 hours
- Production release: 24-72 hours

### Common Rejection Reasons
- [ ] Verify app doesn't violate polices
- [ ] Ensure proper permissions
- [ ] Check for deceptive practices
- [ ] Review safety features compliance
- [ ] Validate biometric implementation
- [ ] Ensure payment compliance

### If Rejected
- [ ] Read rejection reason carefully
- [ ] Document issue
- [ ] Implement fix
- [ ] Create new build
- [ ] Resubmit with explanation
- [ ] Follow up within 24 hours

---

## Launch Strategy

### Phase 1: Internal Testing
- **Duration:** 1-2 weeks
- **Testers:** 10-25 internal team members
- **Focus:** Functionality, crashes, critical bugs
- **Metrics:** Crash-free rate > 99%

### Phase 2: Closed/Beta Testing
- **Duration:** 2-4 weeks
- **Testers:** 100+ external beta testers
- **Focus:** User experience, feature feedback, edge cases
- **Metrics:** 4+ star rating, crash-free rate > 99.5%

### Phase 3: Staged Rollout
- **Week 1:** 10% of users
- **Week 2:** 25% of users
- **Week 3:** 50% of users
- **Week 4:** 100% of users
- **Monitor:** Crash rates, ratings, feedback

### Phase 4: Full Release
- **Announcement:** Press release, social media
- **Marketing:** Influencer partnerships
- **Support:** Dedicated support team ready
- **Monitoring:** Dashboard tracking KPIs

---

## Post-Launch Monitoring

### Key Metrics
- [ ] Install rate
- [ ] Crash-free rate
- [ ] User retention
- [ ] Ratings and reviews
- [ ] Daily active users (DAU)
- [ ] Monthly active users (MAU)
- [ ] Session length
- [ ] Ride completion rate
- [ ] Payment success rate

### Support
- [ ] Respond to reviews
- [ ] Monitor support email
- [ ] Track crash reports
- [ ] Address critical issues
- [ ] Plan updates based on feedback

---

## Version Update Checklist

For future updates, repeat:
1. Code quality checks
2. Testing on multiple devices
3. Performance optimization
4. Security review
5. Update version number
6. Write release notes
7. Create new build
8. Submit update
9. Monitor rollout

---

## Contact Information

**Store Listing Contact:**
- Name: [To be filled]
- Email: [To be filled]
- Phone: [To be filled]

**Support Contact:**
- Email: support@gowithsally.com
- Phone: [To be filled]

**Developer Contact:**
- Organization: Go With Sally
- Website: [To be filled]
- Email: developer@gowithsally.com

---

## Additional Resources

- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [App Policies](https://play.google.com/about/developer-content-policy/)
- [Prepare for Launch Guide](https://developer.android.com/studio/publish/preparing)
- [Material Design Guidelines](https://material.io/design/)

---

**Last Reviewed:** 2026-03-18
**Next Review:** Before each submission
**Owner:** Product Team
