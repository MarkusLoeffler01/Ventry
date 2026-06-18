type PrivacyPersonalDataSupplementProps = {
  language: "en" | "de";
};

export default function PrivacyPersonalDataSupplement({
  language,
}: PrivacyPersonalDataSupplementProps) {
  if (language === "de") {
    return (
      <section>
        <h2>Ventry-spezifische Verarbeitung von Registrierungs- und Check-in-Daten</h2>
        <p>Stand: 9. Juni 2026</p>
        <p>
          Ventry verarbeitet zusaetzlich zu den in der allgemeinen Datenschutzerklaerung beschriebenen Daten die
          Informationen, die fuer Nutzerkonten, Eventregistrierungen, Tickets, Zahlungen und den Einlass vor Ort
          erforderlich sind.
        </p>

        <h3>Welche Daten wir dafuer verarbeiten</h3>
        <ul>
          <li>Kontodaten wie Anzeigename, E-Mail-Adresse, Login-Informationen und Profilangaben.</li>
          <li>Identitaets- und Kontaktdaten wie rechtlicher Name, Anschrift, Stadt, Region, Postleitzahl und Land.</li>
          <li>Event- und Ticketdaten wie ausgewaehlte Ticketart, Add-ons, Unterkunftsoptionen, individuelle Formularfelder, Ticketnummer und QR-Code.</li>
          <li>Zahlungsbezogene Daten wie Zahlungsbetrag, Waehrung, Zahlungsstatus und Zahlungsanbieter. Vollstaendige Karten- oder Bankdaten speichern wir nicht.</li>
          <li>Check-in-Daten wie Zeitpunkt des Check-ins, Scan-Ergebnis, pruefender Admin und Hinweise zur Ticketpruefung.</li>
        </ul>

        <h3>Warum wir diese Daten verarbeiten</h3>
        <p>
          Wir verwenden diese Daten, um Nutzerkonten bereitzustellen, Eventregistrierungen abzuwickeln, Tickets und
          Add-ons zu verwalten, Zahlungen zuzuordnen, Supportanfragen zu bearbeiten, den Einlass zum Event zu
          pruefen und Missbrauch wie doppelte oder unberechtigte Check-ins zu verhindern. Rechtsgrundlagen sind
          insbesondere Vertragserfuellung bzw. vorvertragliche Massnahmen, berechtigte Interessen an einem sicheren
          Eventbetrieb sowie gesetzliche Aufbewahrungs- und Nachweispflichten.
        </p>

        <h3>Wer diese Daten sehen kann</h3>
        <ul>
          <li>Andere Teilnehmende sehen nur oeffentliche Profil- oder Teilnehmerlistenangaben, die dafuer vorgesehen oder von Ihnen freigegeben sind.</li>
          <li>Organisatoren und Admins sehen in normalen Eventansichten die fuer die Eventverwaltung erforderlichen Registrierungs-, Ticket-, Zahlungs- und Supportinformationen.</li>
          <li>Ihre Anschrift wird nicht in der Check-in-Snapshot- oder Scanneransicht angezeigt.</li>
          <li>Beim Check-in vor Ort kann autorisiertes Check-in-Personal Ihren rechtlichen Namen und Ihre Ticketinformationen sehen, um diese kurz mit einem Ausweisdokument abzugleichen.</li>
          <li>Zahlungsanbieter wie Stripe verarbeiten Zahlungsdaten nach ihren eigenen Datenschutzbedingungen; Ventry erhaelt nur die fuer die Zuordnung und Statuspruefung erforderlichen Zahlungsinformationen.</li>
        </ul>

        <h3>Speicherung, Zugriff und Loeschung</h3>
        <p>
          Wir speichern personenbezogene Registrierungs- und Check-in-Daten nur so lange, wie sie fuer Konto,
          Eventabwicklung, Zahlungszuordnung, Support, Sicherheit, Missbrauchsvermeidung oder gesetzliche
          Aufbewahrungspflichten erforderlich sind. Nutzer koennen ihre Profildaten bearbeiten, einen Datenexport
          anfordern und im Rahmen der gesetzlichen Vorgaben Auskunft, Berichtigung oder Loeschung verlangen.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>Ventry-specific processing of registration and check-in data</h2>
      <p>Date: 9 June 2026</p>
      <p>
        In addition to the data described in the general privacy policy, Ventry processes the information needed
        for user accounts, event registrations, tickets, payments, and on-site admission.
      </p>

      <h3>Data we process for this purpose</h3>
      <ul>
        <li>Account data such as display name, email address, login information, and profile details.</li>
        <li>Identity and contact data such as legal name, address, city, state or region, postal code, and country.</li>
        <li>Event and ticket data such as selected ticket type, add-ons, accommodation choices, custom registration fields, ticket number, and QR code.</li>
        <li>Payment-related data such as amount, currency, payment status, and payment provider. We do not store full card or bank details.</li>
        <li>Check-in data such as check-in time, scan result, verifying admin, and ticket verification notes.</li>
      </ul>

      <h3>Why we process this data</h3>
      <p>
        We use this data to provide user accounts, process event registrations, manage tickets and add-ons, assign
        payments, handle support requests, verify admission to events, and prevent misuse such as duplicate or
        unauthorized check-ins. The legal bases include performance of a contract or pre-contractual steps,
        legitimate interests in secure event operations, and statutory retention or documentation obligations.
      </p>

      <h3>Who can see this data</h3>
      <ul>
        <li>Other attendees only see public profile or attendee-list information that is intended for that purpose or that you choose to share.</li>
        <li>Organizers and admins can see registration, ticket, payment, and support information required to manage the event.</li>
        <li>Your address is not shown in the check-in snapshot or scanner view.</li>
        <li>At on-site check-in, authorized check-in staff may see your legal name and ticket information to briefly compare it with an ID document.</li>
        <li>Payment providers such as Stripe process payment data under their own privacy terms; Ventry receives only the payment information needed for assignment and status checks.</li>
      </ul>

      <h3>Storage, access, and deletion</h3>
      <p>
        We keep personal registration and check-in data only for as long as needed for accounts, event operations,
        payment assignment, support, security, abuse prevention, or statutory retention duties. Users can update
        their profile data, request a data export, and request access, correction, or deletion where legally
        available.
      </p>
    </section>
  );
}
