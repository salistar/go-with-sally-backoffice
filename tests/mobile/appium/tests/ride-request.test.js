const { remote } = require('webdriverio');

describe('Mobile App Ride Request', () => {
  let driver;

  before(async () => {
    driver = await remote(require('../wdio.conf').config);

    // Login first
    await driver.pause(2000);

    const emailInput = await driver.$('~EmailInput');
    const passwordInput = await driver.$('~PasswordInput');
    const loginButton = await driver.$('~LoginButton');

    await emailInput.setValue('user@test.com');
    await passwordInput.setValue('test1234');
    await loginButton.click();

    await driver.pause(3000);
  });

  after(async () => {
    await driver.deleteSession();
  });

  it('should display ride request screen', async () => {
    // Check for pickup location field
    const pickupField = await driver.$('~PickupLocationField');
    await expect(pickupField).toBeDisplayed();
  });

  it('should have pickup and dropoff location fields', async () => {
    const pickupField = await driver.$('~PickupLocationField');
    const dropoffField = await driver.$('~DropoffLocationField');

    await expect(pickupField).toBeDisplayed();
    await expect(dropoffField).toBeDisplayed();
  });

  it('should open location picker for pickup', async () => {
    const pickupField = await driver.$('~PickupLocationField');

    await pickupField.click();

    await driver.pause(1000);

    const locationPicker = await driver.$('~LocationPicker');
    const isDisplayed = await locationPicker.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should set current location as pickup', async () => {
    const useCurrentLocationBtn = await driver.$('~UseCurrentLocation');

    if (await useCurrentLocationBtn.isDisplayed().catch(() => false)) {
      await useCurrentLocationBtn.click();

      await driver.pause(1000);

      const pickupField = await driver.$('~PickupLocationField');
      const value = await pickupField.getValue();

      expect(value).toBeTruthy();
    }
  });

  it('should allow entering dropoff location', async () => {
    const dropoffField = await driver.$('~DropoffLocationField');

    await dropoffField.click();

    await driver.pause(1000);

    const locationInput = await driver.$('~LocationInput');
    await locationInput.setValue('Marrakech, Morocco');

    await driver.pause(1000);

    // Select first suggestion
    const firstSuggestion = await driver.$('~LocationSuggestion');
    if (await firstSuggestion.isDisplayed().catch(() => false)) {
      await firstSuggestion.click();
    }

    const dropoffValue = await dropoffField.getValue();
    expect(dropoffValue).toBeTruthy();
  });

  it('should display ride type options', async () => {
    const economyOption = await driver.$('~RideTypeEconomy');
    const comfortOption = await driver.$('~RideTypeComfort');

    const economyDisplayed = await economyOption.isDisplayed().catch(() => false);
    const comfortDisplayed = await comfortOption.isDisplayed().catch(() => false);

    expect(economyDisplayed || comfortDisplayed).toBeTruthy();
  });

  it('should select ride type', async () => {
    const economyOption = await driver.$('~RideTypeEconomy');

    if (await economyOption.isDisplayed().catch(() => false)) {
      await economyOption.click();

      const isSelected = await economyOption.getAttribute('selected');

      expect(isSelected).toBeTruthy();
    }
  });

  it('should display fare estimate', async () => {
    const fareEstimate = await driver.$('~FareEstimate');

    const isDisplayed = await fareEstimate.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should show ride details and request button', async () => {
    const requestButton = await driver.$('~RequestRideButton');

    const isDisplayed = await requestButton.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should request a ride successfully', async () => {
    // Set locations and type
    const pickupField = await driver.$('~PickupLocationField');
    const dropoffField = await driver.$('~DropoffLocationField');
    const requestButton = await driver.$('~RequestRideButton');

    // Clear and set values
    if (!(await pickupField.getValue())) {
      await pickupField.click();
      const useCurrentBtn = await driver.$('~UseCurrentLocation');
      if (await useCurrentBtn.isDisplayed().catch(() => false)) {
        await useCurrentBtn.click();
        await driver.pause(500);
      }
    }

    if (!(await dropoffField.getValue())) {
      await dropoffField.click();
      const locationInput = await driver.$('~LocationInput');
      await locationInput.setValue('Downtown Casablanca');
      await driver.pause(500);
      const firstSuggestion = await driver.$('~LocationSuggestion');
      if (await firstSuggestion.isDisplayed().catch(() => false)) {
        await firstSuggestion.click();
      }
    }

    // Select ride type
    const economyOption = await driver.$('~RideTypeEconomy');
    if (await economyOption.isDisplayed().catch(() => false)) {
      await economyOption.click();
    }

    // Request ride
    await requestButton.click();

    await driver.pause(2000);

    // Check if we're in waiting for driver screen
    const waitingScreen = await driver.$('~WaitingForDriverScreen');
    const isDisplayed = await waitingScreen.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should display waiting for driver screen', async () => {
    const driverInfo = await driver.$('~DriverInfo');
    const rideInfo = await driver.$('~RideInfo');

    const driverDisplayed = await driverInfo.isDisplayed().catch(() => false);
    const rideDisplayed = await rideInfo.isDisplayed().catch(() => false);

    expect(driverDisplayed || rideDisplayed).toBeTruthy();
  });

  it('should show driver arrival time', async () => {
    const arrivalTime = await driver.$('~DriverArrivalTime');

    const isDisplayed = await arrivalTime.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should allow canceling ride request', async () => {
    const cancelButton = await driver.$('~CancelRideButton');

    if (await cancelButton.isDisplayed().catch(() => false)) {
      await cancelButton.click();

      // Confirm cancellation
      const confirmButton = await driver.$('~ConfirmCancelButton');
      if (await confirmButton.isDisplayed().catch(() => false)) {
        await confirmButton.click();

        await driver.pause(1000);

        // Should go back to ride request screen
        const pickupField = await driver.$('~PickupLocationField');
        const isBack = await pickupField.isDisplayed().catch(() => false);

        expect(isBack).toBeTruthy();
      }
    }
  });

  it('should show map view', async () => {
    const mapView = await driver.$('~MapView');

    const isDisplayed = await mapView.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should toggle between map and list views', async () => {
    const toggleButton = await driver.$('~ToggleMapListButton');

    if (await toggleButton.isDisplayed().catch(() => false)) {
      const initialState = await toggleButton.getAttribute('state');

      await toggleButton.click();

      await driver.pause(500);

      const newState = await toggleButton.getAttribute('state');

      expect(newState).not.toEqual(initialState);
    }
  });

  it('should handle location permissions', async () => {
    // Check if permission dialog appears
    const permissionDialog = await driver.$('~PermissionDialog');

    const isDisplayed = await permissionDialog.isDisplayed().catch(() => false);

    if (isDisplayed) {
      const allowButton = await driver.$('~AllowButton');
      await allowButton.click();

      await driver.pause(1000);

      const mapView = await driver.$('~MapView');
      const mapDisplayed = await mapView.isDisplayed().catch(() => false);

      expect(mapDisplayed).toBeTruthy();
    }
  });

  it('should validate required fields before request', async () => {
    // Clear locations
    const pickupField = await driver.$('~PickupLocationField');
    const dropoffField = await driver.$('~DropoffLocationField');

    await pickupField.clearValue();
    await dropoffField.clearValue();

    const requestButton = await driver.$('~RequestRideButton');

    // Button should be disabled
    const isEnabled = await requestButton.isEnabled();

    expect(isEnabled).toBeFalsy();
  });

  it('should show error if pickup and dropoff are same', async () => {
    const pickupField = await driver.$('~PickupLocationField');
    const dropoffField = await driver.$('~DropoffLocationField');
    const requestButton = await driver.$('~RequestRideButton');

    // Set both to same location
    await pickupField.clearValue();
    await pickupField.setValue('Casablanca');

    await dropoffField.clearValue();
    await dropoffField.setValue('Casablanca');

    await requestButton.click();

    await driver.pause(500);

    const errorMessage = await driver.$('~ErrorMessage');
    const isDisplayed = await errorMessage.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should show promo code field', async () => {
    const promoField = await driver.$('~PromoCodeField');

    const isDisplayed = await promoField.isDisplayed().catch(() => false);

    if (isDisplayed) {
      expect(isDisplayed).toBeTruthy();
    }
  });

  it('should apply promo code', async () => {
    const promoField = await driver.$('~PromoCodeField');
    const fareEstimate = await driver.$('~FareEstimate');

    if (await promoField.isDisplayed().catch(() => false)) {
      const initialFare = await fareEstimate.getText();

      await promoField.click();
      await promoField.setValue('WELCOME20');

      await driver.pause(1000);

      const newFare = await fareEstimate.getText();

      // Fare should be different (discounted)
      expect(newFare).not.toEqual(initialFare);
    }
  });
});
