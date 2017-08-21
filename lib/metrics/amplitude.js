/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-disable no-use-before-define */

'use strict'

const APP_VERSION = /^[0-9]+\.([0-9]+)\./.exec(require('../../package.json').version)[1]

const GROUPS = {
  activity: 'fxa_activity',
  email: 'fxa_email',
  login: 'fxa_login',
  registration: 'fxa_reg',
  sms: 'fxa_sms'
}

const EVENTS = {
  'account.confirmed': {
    group: GROUPS.login,
    event: 'email_confirmed'
  },
  'account.created': {
    group: GROUPS.registration,
    event: 'created'
  },
  'account.login': {
    group: GROUPS.login,
    event: 'success'
  },
  'account.login.blocked': {
    group: GROUPS.login,
    event: 'blocked'
  },
  'account.login.confirmedUnblockCode': {
    group: GROUPS.login,
    event: 'unblock_success'
  },
  'account.reset': {
    group: GROUPS.login,
    event: 'forgot_complete'
  },
  'account.signed': {
    group: GROUPS.activity,
    event: 'cert_signed'
  },
  'account.verified': {
    group: GROUPS.registration,
    event: 'email_confirmed'
  },
  'flow.complete': {
    isDynamicGroup: true,
    group: event => GROUPS[event.flowType],
    event: 'complete'
  },
  'password.forgot.resend_code.completed': {
    group: GROUPS.login,
    event: 'forgot_sent'
  },
  'password.forgot.send_code.completed': {
    group: GROUPS.login,
    event: 'forgot_sent'
  },
  'sms.installFirefox.sent': {
    group: GROUPS.sms,
    event: 'sent'
  }
}

const EMAIL_EVENTS = /^email\.(\w+)\.(bounced|sent)$/

module.exports = log => {
  return receiveEvent

  function receiveEvent (event, request, data = {}, metricsContext = {}) {
    let mapping = EVENTS[event]

    if (! mapping) {
      const matches = EMAIL_EVENTS.exec(event)
      if (matches) {
        mapping = {
          group: GROUPS.email,
          event: matches[2],
          eventCategory: matches[1]
        }
      }
    }

    if (mapping) {
      let group = mapping.group
      if (mapping.isDynamicGroup) {
        group = group(event)
      }
      if (mapping.eventCategory) {
        data.eventCategory = mapping.eventCategory
      }
      log.amplitudeEvent({
        time: metricsContext.time || Date.now(),
        event_type: `${group} - ${mapping.event}`,
        event_properties: mapEventProperties(mapping.group, request, data, metricsContext),
        user_properties: mapUserProperties(mapping.group, request, data, metricsContext),
        app_version: APP_VERSION,
        language: request.app.locale
      })
    }
  }
}

function mapEventProperties (group, request, data, metricsContext) {
  // The entrypoint property is missing because we don't have it in the auth server
  return Object.assign({
    device_id: data.device_id || getFromToken(request, 'deviceId'),
    service: data.service || request.query.service || request.payload.service
  }, EVENT_PROPERTIES[group](request, data, metricsContext))
}

function getFromToken (request, property) {
  if (request.auth.credentials) {
    return request.auth.credentials[property]
  }
}

const NOP = () => {}

const EVENT_PROPERTIES = {
  [GROUPS.activity]: NOP,
  [GROUPS.email]: mapEmailType,
  [GROUPS.login]: NOP,
  [GROUPS.registration]: NOP,
  [GROUPS.sms]: NOP
}

// Some mappings are missing because I'm not sure what their emailType is yet
const EMAIL_TYPES = {
  newDeviceLoginEmail: 'login',
  passwordChangedEmail: '',
  passwordResetEmail: '',
  passwordResetRequiredEmail: '',
  postRemoveSecondaryEmail: '',
  postVerifyEmail: 'registration',
  postVerifySecondaryEmail: '',
  recoveryEmail: '',
  unblockCode: 'unblock',
  verificationReminderFirstEmail: 'registration',
  verificationReminderSecondEmail: 'registration',
  verificationReminderEmail: 'registration',
  verifyEmail: 'registration',
  verifyLoginEmail: 'login',
  verifySyncEmail: 'registration',
  verifySecondaryEmail: ''
}

function mapEmailType (request, data) {
  const emailType = EMAIL_TYPES[data.eventCategory]
  if (emailType) {
    return {
      email_type: emailType
    }
  }
}

function mapUserProperties (group, request, data, metricsContext) {
  const { browser, browserVersion, os } = request.app.ua
  return Object.assign({
    flow_id: metricsContext.flow_id,
    ua_browser: browser,
    ua_version: browserVersion,
    ua_os: os
  }, USER_PROPERTIES[group](request, data, metricsContext))
}

// The following user properties are missing because we don't have them in the
// auth server: utm_campaign, utm_content, utm_medium, utm_source, utm_term
const USER_PROPERTIES = {
  [GROUPS.activity]: mapUid,
  [GROUPS.email]: mapUid,
  [GROUPS.login]: mapUid,
  [GROUPS.registration]: mapUid,
  [GROUPS.sms]: NOP
}

function mapUid (request, data) {
  return {
    fxa_uid: data.uid || getFromToken(request, 'uid')
  }
}
