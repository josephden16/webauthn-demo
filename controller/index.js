// Import necessary modules and functions
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import {
  bufferToBase64URLString,
  base64URLStringToBuffer,
} from "@simplewebauthn/browser";
import { v4 } from "uuid";
import User from "../models/User.js";
import PassKey from "../models/PassKey.js";

// Human-readable title for your website
const relyingPartyName = "WebAuthn Demo";
// A unique identifier for your website
const relyingPartyID = "sincere-jawfish-new.ngrok-free.app";
// The URL at which registrations and authentications should occur
const origin = `https://${relyingPartyID}`;

// Controller function to generate registration options
export const generateRegistrationOptionsCtrl = async (req, res) => {
  const { username } = req.query;
  const user = await User.findOne({ username });
  let userAuthenticators = [];

  // Retrieve authenticators used by the user before, if any
  if (user) {
    userAuthenticators = [...user.authenticators];
  }

  // Generate a unique ID for the current user session
  let currentUserId;
  if (!req.session.currentUserId) {
    currentUserId = v4();
    req.session.currentUserId = currentUserId;
  } else {
    currentUserId = req.session.currentUserId;
  }

  // Generate registration options
  const options = await generateRegistrationOptions({
    rpName: relyingPartyName,
    rpID: relyingPartyID,
    userID: currentUserId,
    userName: username,
    timeout: 60000,
    attestationType: "none", // Don't prompt users for additional information
    excludeCredentials: userAuthenticators.map((authenticator) => ({
      id: authenticator.credentialID,
      type: "public-key",
      transports: authenticator.transports,
    })),
    supportedAlgorithmIDs: [-7, -257],
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // Save the challenge to the session
  req.session.challenge = options.challenge;
  res.send(options);
};

// Controller function to verify registration
export const verifyRegistrationCtrl = async (req, res) => {
  const body = req.body;
  const { username } = req.query;
  const user = await User.findOne({ username });
  const expectedChallenge = req.session.challenge;

  // Check if the expected challenge exists
  if (!expectedChallenge) {
    return res.status(400).send({ error: "Failed: No challenge found" });
  }

  let verification;

  try {
    const verificationOptions = {
      response: body,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin: origin,
      expectedRPID: relyingPartyID,
      requireUserVerification: false,
    };
    verification = await verifyRegistrationResponse(verificationOptions);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ error: error.message });
  }

  const { verified, registrationInfo } = verification;

  // If registration is verified, update user data
  if (verified && registrationInfo) {
    const {
      credentialPublicKey,
      credentialID,
      counter,
      credentialBackedUp,
      credentialDeviceType,
    } = registrationInfo;

    const credId = bufferToBase64URLString(credentialID);
    const credPublicKey = bufferToBase64URLString(credentialPublicKey);

    const newDevice = {
      credentialPublicKey: credPublicKey,
      credentialID: credId,
      counter,
      transports: body.response.transports,
    };

    // Check if the device already exists for the user
    const existingDevice = user?.authenticators.find(
      (authenticator) => authenticator.credentialID === credId
    );

    if (!existingDevice && user) {
      // Add the new device to the user's list of devices
      await User.updateOne(
        { _id: user._id },
        { $push: { authenticators: newDevice } }
      );
      await PassKey.create({
        counter,
        credentialID: credId,
        user: user._id,
        webAuthnUserID: req.session.currentUserId,
        publicKey: credPublicKey,
        backedUp: credentialBackedUp,
        deviceType: credentialDeviceType,
        transports: body.response.transports,
        authenticators: [newDevice],
      });
    } else {
      const newUser = await User.create({
        username,
        authenticators: [newDevice],
      });
      await PassKey.create({
        counter,
        credentialID: credId,
        user: newUser._id,
        webAuthnUserID: req.session.currentUserId,
        publicKey: credPublicKey,
        backedUp: credentialBackedUp,
        deviceType: credentialDeviceType,
        transports: body.response.transports,
        authenticators: [newDevice],
      });
    }
  }

  // Clear the challenge from the session
  req.session.challenge = undefined;

  res.send({ verified });
};

// Controller function to generate authentication options
export const generateAuthenticationOptionsCtrl = async (req, res) => {
  const { username } = req.query;
  const user = await User.findOne({ username });

  if (!user) {
    return res
      .status(404)
      .send({ error: "User with this username does not exist" });
  }

  const options = await generateAuthenticationOptions({
    rpID: relyingPartyID,
    timeout: 60000,
    allowCredentials: user.authenticators.map((authenticator) => ({
      id: base64URLStringToBuffer(authenticator.credentialID),
      transports: authenticator.transports,
      type: "public-key",
    })),
    userVerification: "preferred",
  });

  req.session.challenge = options.challenge;
  res.send(options);
};

// Controller function to verify authentication
export const verifyAuthenticationCtrl = async (req, res) => {
  const body = req.body;
  const { username } = req.query;

  const user = await User.findOne({ username });

  if (!user) {
    return res
      .status(404)
      .send({ error: "User with this username does not exist" });
  }

  const passKey = await PassKey.findOne({
    user: user._id,
    credentialID: body.id,
  });

  if (!passKey) {
    return res
      .status(400)
      .send({ error: "Could not find passkey for this user" });
  }

  const expectedChallenge = req.session.challenge;

  let dbAuthenticator;

  // Check if the authenticator exists in the user's data
  for (const authenticator of user.authenticators) {
    if (authenticator.credentialID === body.id) {
      dbAuthenticator = authenticator;
      dbAuthenticator.credentialPublicKey = base64URLStringToBuffer(
        authenticator.credentialPublicKey
      );
      break;
    }
  }

  // If the authenticator is not found, return an error
  if (!dbAuthenticator) {
    return res.status(400).send({
      error: "This authenticator is not registered with this site",
    });
  }

  let verification;
  try {
    const verificationOptions = {
      response: body,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin: origin,
      expectedRPID: relyingPartyID,
      authenticator: dbAuthenticator,
      requireUserVerification: false,
    };
    verification = await verifyAuthenticationResponse(verificationOptions);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ error: error.message });
  }

  const { verified, authenticationInfo } = verification;

  if (verified) {
    // Update the authenticator's counter in the DB to the newest count in the authentication
    dbAuthenticator.counter = authenticationInfo.newCounter;
    const filter = { username };
    const update = {
      $set: {
        "authenticators.$[element].counter": authenticationInfo.newCounter,
      },
    };
    const options = {
      arrayFilters: [{ "element.credentialID": dbAuthenticator.credentialID }],
    };
    await User.updateOne(filter, update, options);
  }

  // Clear the challenge from the session
  req.session.challenge = undefined;

  res.send({ verified, username: user.username });
};
