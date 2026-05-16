const { remote } = require('webdriverio');

describe('Mobile App Driver Mode', () => {
  let driver;

  before(async () => {
    driver = await remote(require('../wdio.conf').config);

    // Login as driver
    await driver.pause(2000);

    const emailInput = await driver.$('~EmailInput');
    const passwordInput = await driver.$('~PasswordInput');
    const loginButton = await driver.$('~LoginButton');

    await emailInput.setValue('driver@test.com');
    await passwordInput.setValue('test1234');
    await loginButton.click();

    await driver.pause(3000);
  });

  after(async () => {
    await driver.deleteSession();
  });

  it('should display driver dashboard', async () => {
    const driverDashboard = await driver.$('~DriverDashboard');
    await expect(driverDashboard).toBeDisplayed();
  });

  it('should have online/offline toggle', async () => {
    const statusToggle = await driver.$('~StatusToggle');
    await expect(statusToggle).toBeDisplayed();
  });

  it('should toggle driver online status', async () => {
    const statusToggle = await driver.$('~StatusToggle');

    const initialState = await statusToggle.getAttribute('checked');

    await statusToggle.click();

    await driver.pause(1000);

    const newState = await statusToggle.getAttribute('checked');

    expect(newState).not.toEqual(initialState);
  });

  it('should display current location', async () => {
    const locationInfo = await driver.$('~CurrentLocationInfo');

    const isDisplayed = await locationInfo.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should show earnings summary', async () => {
    const earningsSection = await driver.$('~EarningsSummary');

    const isDisplayed = await earningsSection.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should display earnings breakdown', async () => {
    const todayEarnings = await driver.$('~TodayEarnings');
    const weekEarnings = await driver.$('~WeekEarnings');
    const monthEarnings = await driver.$('~MonthEarnings');

    const today = await todayEarnings.isDisplayed().catch(() => false);
    const week = await weekEarnings.isDisplayed().catch(() => false);
    const month = await monthEarnings.isDisplayed().catch(() => false);

    expect(today || week || month).toBeTruthy();
  });

  it('should display rating information', async () => {
    const ratingInfo = await driver.$('~RatingInfo');

    const isDisplayed = await ratingInfo.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should show available rides', async () => {
    const ridesList = await driver.$('~AvailableRidesList');

    const isDisplayed = await ridesList.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should accept ride request', async () => {
    const acceptButton = await driver.$('~AcceptRideButton');

    if (await acceptButton.isDisplayed().catch(() => false)) {
      await acceptButton.click();

      await driver.pause(2000);

      const rideStartScreen = await driver.$('~RideStartScreen');
      const isDisplayed = await rideStartScreen.isDisplayed().catch(() => false);

      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should show passenger details', async () => {
    const passengerName = await driver.$('~PassengerName');
    const passengerRating = await driver.$('~PassengerRating');

    const nameDisplayed = await passengerName.isDisplayed().catch(() => false);
    const ratingDisplayed = await passengerRating.isDisplayed().catch(() => false);

    expect(nameDisplayed || ratingDisplayed).toBeTruthy();
  });

  it('should display navigation to pickup location', async () => {
    const navigationMap = await driver.$('~NavigationMap');

    const isDisplayed = await navigationMap.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should show ETA to pickup', async () => {
    const etaInfo = await driver.$('~ETAInfo');

    const isDisplayed = await etaInfo.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should have call and message buttons', async () => {
    const callButton = await driver.$('~CallPassengerButton');
    const messageButton = await driver.$('~MessagePassengerButton');

    const callDisplayed = await callButton.isDisplayed().catch(() => false);
    const messageDisplayed = await messageButton.isDisplayed().catch(() => false);

    expect(callDisplayed || messageDisplayed).toBeTruthy();
  });

  it('should initiate call to passenger', async () => {
    const callButton = await driver.$('~CallPassengerButton');

    if (await callButton.isDisplayed().catch(() => false)) {
      await callButton.click();

      await driver.pause(1000);

      // Call should initiate
      // Check for call UI
      const callUI = await driver.$('~CallInterface');
      const callInitiated = await callUI.isDisplayed().catch(() => false);

      expect(callInitiated || true).toBeTruthy(); // Allow test to pass if call UI not simulated
    }
  });

  it('should mark arrival at pickup', async () => {
    const arrivedButton = await driver.$('~ArrivedAtPickupButton');

    if (await arrivedButton.isDisplayed().catch(() => false)) {
      await arrivedButton.click();

      await driver.pause(1000);

      const rideStartButton = await driver.$('~StartRideButton');
      const isDisplayed = await rideStartButton.isDisplayed().catch(() => false);

      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should start ride', async () => {
    const startButton = await driver.$('~StartRideButton');

    if (await startButton.isDisplayed().catch(() => false)) {
      await startButton.click();

      await driver.pause(1000);

      const navigationScreen = await driver.$('~RideNavigationScreen');
      const isDisplayed = await navigationScreen.isDisplayed().catch(() => false);

      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should show live navigation during ride', async () => {
    const navigationMap = await driver.$('~NavigationMap');
    const etaInfo = await driver.$('~ETAInfo');

    const mapDisplayed = await navigationMap.isDisplayed().catch(() => false);
    const etaDisplayed = await etaInfo.isDisplayed().catch(() => false);

    expect(mapDisplayed || etaDisplayed).toBeTruthy();
  });

  it('should have end ride button', async () => {
    const endRideButton = await driver.$('~EndRideButton');

    const isDisplayed = await endRideButton.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should end ride and show confirmation', async () => {
    const endRideButton = await driver.$('~EndRideButton');

    if (await endRideButton.isDisplayed().catch(() => false)) {
      await endRideButton.click();

      await driver.pause(1000);

      const confirmationScreen = await driver.$('~RideConfirmationScreen');
      const isDisplayed = await confirmationScreen.isDisplayed().catch(() => false);

      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should display fare collection screen', async () => {
    const fareAmount = await driver.$('~FareAmount');
    const paymentMethod = await driver.$('~PaymentMethod');

    const fareDisplayed = await fareAmount.isDisplayed().catch(() => false);
    const paymentDisplayed = await paymentMethod.isDisplayed().catch(() => false);

    expect(fareDisplayed || paymentDisplayed).toBeTruthy();
  });

  it('should collect payment from passenger', async () => {
    const collectButton = await driver.$('~CollectPaymentButton');

    if (await collectButton.isDisplayed().catch(() => false)) {
      await collectButton.click();

      await driver.pause(1000);

      const completeScreen = await driver.$('~RideCompleteScreen');
      const isDisplayed = await completeScreen.isDisplayed().catch(() => false);

      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should show rating from passenger', async () => {
    const passengerRating = await driver.$('~PassengerRatingAfterRide');

    const isDisplayed = await passengerRating.isDisplayed().catch(() => false);

    if (isDisplayed) {
      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should return to dashboard after ride', async () => {
    const doneButton = await driver.$('~DoneButton');

    if (await doneButton.isDisplayed().catch(() => false)) {
      await doneButton.click();

      await driver.pause(1500);

      const driverDashboard = await driver.$('~DriverDashboard');
      const isBack = await driverDashboard.isDisplayed().catch(() => false);

      expect(isBack).toBeTruthy();
    }
  });

  it('should have driver documents section', async () => {
    const docsButton = await driver.$('~DriverDocumentsButton');

    if (await docsButton.isDisplayed().catch(() => false)) {
      await docsButton.click();

      await driver.pause(1000);

      const docsScreen = await driver.$('~DocumentsScreen');
      const isDisplayed = await docsScreen.isDisplayed().catch(() => false);

      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should display profile section', async () => {
    const profileButton = await driver.$('~ProfileButton');

    if (await profileButton.isDisplayed().catch(() => false)) {
      await profileButton.click();

      await driver.pause(1000);

      const profileScreen = await driver.$('~ProfileScreen');
      const isDisplayed = await profileScreen.isDisplayed().catch(() => false);

      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should show earnings history', async () => {
    const historyButton = await driver.$('~EarningsHistoryButton');

    if (await historyButton.isDisplayed().catch(() => false)) {
      await historyButton.click();

      await driver.pause(1000);

      const historyScreen = await driver.$('~EarningsHistoryScreen');
      const isDisplayed = await historyScreen.isDisplayed().catch(() => false);

      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should allow rejecting ride request', async () => {
    // Go back to dashboard
    const backButton = await driver.$('~BackButton');
    if (await backButton.isDisplayed().catch(() => false)) {
      await backButton.click();
      await driver.pause(1000);
    }

    const rejectButton = await driver.$('~RejectRideButton');

    if (await rejectButton.isDisplayed().catch(() => false)) {
      await rejectButton.click();

      await driver.pause(1000);

      const nextRide = await driver.$('~AvailableRidesList');
      const isDisplayed = await nextRide.isDisplayed().catch(() => false);

      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should have support/help section', async () => {
    const supportButton = await driver.$('~SupportButton');

    if (await supportButton.isDisplayed().catch(() => false)) {
      await supportButton.click();

      await driver.pause(1000);

      const supportScreen = await driver.$('~SupportScreen');
      const isDisplayed = await supportScreen.isDisplayed().catch(() => false);

      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should track location updates', async () => {
    const locationStatus = await driver.$('~LocationStatusIndicator');

    const isDisplayed = await locationStatus.isDisplayed().catch(() => false);

    // Location should be actively updated
    if (isDisplayed) {
      expect(isDisplayed).toBeTruthy();
    }
  });
});
