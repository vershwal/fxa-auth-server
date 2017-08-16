/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

const { version: APP_VERSION } = require('../../package.json')

const GROUPS = {
  activitity: 'fxa_activity',
  email: 'fxa_email',
  login: 'fxa_login',
  regstration: 'fxa_reg',
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
  'email.confirmation.sent': {
    group: GROUPS.email,
    event: 'sent'
  },
  'email.verification.sent': {
    group: GROUPS.email,
    event: 'sent'
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

const FUZZY_EVENTS = new Map([
  [ /^email\.\w\.bounced$/, {
    group: GROUPS.email,
    event: 'bounced'
  } ]
])

const EVENT_PROPERTIES = {
  device_id: (request, data) => data.device_id,

}

module.exports = log => {
  return receiveEvent

  function receiveEvent (event, request, data = {}, metricsContext = {}) {
    const eventType = event.type
    let mapping = EVENTS[eventType]

    if (! mapping) {
      for (let [ key, value ] of FUZZY_EVENTS.entries()) {
        if (key.test(eventType)) {
          mapping = value
          break
        }
      }
    }

    if (mapping) {
      log.amplitudeEvent({
        time: event.time || Date.now(),
        event_type: `${mapping.group} - ${mapping.event}`,
        event_properties: mapEventProperties(mapping.group, request, data, metricsContext),
        user_properties: mapUserProperties(mapping.group, request, data, metricsContext),
        app_version: APP_VERSION
      })
    }
  }
}

function mapEventProperties (group, request, data, metricsContext) {
  switch (group) {
    case GROUPS.registration:
  }
}

function mapUserProperties (group, request, data, metricsContext) {
  return Object.assign({
    flow_id: metricsContext.flow_id
  })
}

