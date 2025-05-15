import React, { useState, useEffect } from "react";

const SettingsDialog = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [passphrase, setPassphrase] = useState("");
    const [urlAlert, setUrlAlert] = useState("");

    const [fetchInterval, setFetchInterval] = useState("");

    useEffect(() => {
        if (isOpen) {
            setApiKey(localStorage.getItem("okx_api_key") || "");
            setSecretKey(localStorage.getItem("okx_secret_key") || "");
            setPassphrase(localStorage.getItem("okx_passphrase") || "");
            setFetchInterval(localStorage.getItem("dex_fetch_interval") || "");
            setUrlAlert(localStorage.getItem("url_alert") || "");

        }
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem("okx_api_key", apiKey.trim());
        localStorage.setItem("okx_secret_key", secretKey.trim());
        localStorage.setItem("okx_passphrase", passphrase.trim());
        localStorage.setItem("dex_fetch_interval", fetchInterval);
        localStorage.setItem("url_alert", urlAlert);

        onClose();
    };

    const handleClear = () => {
        localStorage.removeItem("okx_api_key");
        localStorage.removeItem("okx_secret_key");
        localStorage.removeItem("okx_passphrase");
        localStorage.removeItem("dex_fetch_interval");
        localStorage.removeItem("url_alert");
        setApiKey("");
        setSecretKey("");
        setPassphrase("");
        setFetchInterval("");
        setUrlAlert("");
    };

    if (!isOpen) return null;

    return (
        <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <h3 className="text-base font-semibold text-gray-900 mb-4" id="modal-title">Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">OKX API Key</label>
                                    <input
                                        type="text"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">OKX Secret Key</label>
                                    <input
                                        type="password"
                                        value={secretKey}
                                        onChange={(e) => setSecretKey(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">OKX Passphrase</label>
                                    <input
                                        type="password"
                                        value={passphrase}
                                        onChange={(e) => setPassphrase(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Fetch Dex Interval (s)</label>
                                    <input
                                        type="number"
                                        value={fetchInterval}
                                        onInput={(e) => {
                                            let value = parseInt(e.target.value, 10);

                                            // Kiểm tra nếu giá trị rỗng thì bỏ qua
                                            if (isNaN(value)) {
                                                setFetchInterval('');
                                            } else {
                                                // Giới hạn giá trị trong phạm vi min và max
                                                value = Math.max(1, Math.min(value, 120));
                                                setFetchInterval(value);
                                            }
                                        }}
                                        min={1}
                                        max={120}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">URL Alert</label>
                                    <input
                                        type="text"
                                        value={urlAlert}
                                        onChange={(e) => setUrlAlert(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:justify-between sm:px-6">
                            <div className="space-x-2">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="inline-flex justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                                >
                                    Lưu
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50"
                                >
                                    Đóng
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="inline-flex justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsDialog;
