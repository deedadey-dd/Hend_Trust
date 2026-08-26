import pytest
import uuid
from apps.delivery.tracking import (
    generate_carrier_tracking_url,
    DHLTrackingAdapter,
    FedExTrackingAdapter,
    UPSTrackingAdapter,
    SpeedafTrackingAdapter,
    Universal17TrackAdapter,
    verify_and_process_carrier_webhook
)
from apps.checkout.adapters.appsnmobile import AppsNMobileAdapter

def test_generate_carrier_tracking_urls():
    dhl_url = generate_carrier_tracking_url('DHL', '1234567890')
    assert "dhl.com" in dhl_url
    assert "1234567890" in dhl_url

    fedex_url = generate_carrier_tracking_url('FEDEX', '9876543210')
    assert "fedex.com" in fedex_url
    assert "9876543210" in fedex_url

    ups_url = generate_carrier_tracking_url('UPS', '1Z999AA10123456784')
    assert "ups.com" in ups_url
    assert "1Z999AA10123456784" in ups_url

    ems_url = generate_carrier_tracking_url('EMS', 'EE123456789GH')
    assert "ems.post" in ems_url
    assert "EE123456789GH" in ems_url

    speedaf_url = generate_carrier_tracking_url('SPEEDAF', 'SPF999888777')
    assert "speedaf.com" in speedaf_url
    assert "SPF999888777" in speedaf_url

    others_url = generate_carrier_tracking_url('OTHERS', 'TRK999', courier_name='Custom Express')
    assert "google.com" in others_url

def test_carrier_adapters_mock():
    dhl_status = DHLTrackingAdapter.get_shipment_status('1234567890')
    assert 'status' in dhl_status

    fedex_status = FedExTrackingAdapter.get_shipment_status('9876543210')
    assert 'status' in fedex_status

    ups_status = UPSTrackingAdapter.get_shipment_status('1Z999AA10123456784')
    assert 'status' in ups_status

    speedaf_status = SpeedafTrackingAdapter.get_shipment_status('SPF999888777')
    assert 'status' in speedaf_status

    universal_status = Universal17TrackAdapter.get_shipment_status('TRK171717')
    assert 'status' in universal_status

def test_verify_carrier_webhook_parsing():
    dhl_payload = {"trackingNumber": "DHL123", "status": "DELIVERED"}
    processed_dhl = verify_and_process_carrier_webhook('DHL', dhl_payload)
    assert processed_dhl['carrier'] == 'DHL'
    assert processed_dhl['tracking_number'] == 'DHL123'
    assert processed_dhl['is_delivered'] is True

    fedex_payload = {"trackingNumber": "FDX456", "eventType": "SHIPMENT_DELIVERED"}
    processed_fdx = verify_and_process_carrier_webhook('FEDEX', fedex_payload)
    assert processed_fdx['carrier'] == 'FEDEX'
    assert processed_fdx['tracking_number'] == 'FDX456'
    assert processed_fdx['is_delivered'] is True

    speedaf_payload = {"waybillNo": "SPF999", "scanType": "DELIVERED"}
    processed_spf = verify_and_process_carrier_webhook('SPEEDAF', speedaf_payload)
    assert processed_spf['carrier'] == 'SPEEDAF'
    assert processed_spf['tracking_number'] == 'SPF999'
    assert processed_spf['is_delivered'] is True

    universal_payload = {"data": {"number": "UNI777", "sub_status": "DELIVERED_SUCCESS"}}
    processed_uni = verify_and_process_carrier_webhook('UNIVERSAL', universal_payload)
    assert processed_uni['tracking_number'] == 'UNI777'
    assert processed_uni['is_delivered'] is True

def test_appsnmobile_adapter_mock():
    init_res = AppsNMobileAdapter.initialize_transaction(
        email="test@example.com",
        amount_ghs=150.00,
        reference="TESTREF123",
        callback_url="http://localhost:5173/cb"
    )
    assert init_res['status'] == 'success'
    assert 'authorization_url' in init_res

    payout_res = AppsNMobileAdapter.disburse_payout(
        phone_number="0240000000",
        network="MTN",
        amount_ghs=100.00,
        reference="DISBURSEREF123"
    )
    assert payout_res['status'] == 'SUCCESS'
