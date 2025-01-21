import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const CameraSettings = ({ mapCurrent, microscopeControlService, addTileLayer, channelNames }) => {
    const [cameraExposure, setCameraExposure] = useState(100);
    const [illuminationIntensity, setIlluminationIntensity] = useState("50");
    const [illuminationChannel, setIlluminationChannel] = useState("0");

    const fluorescenceOptions = Object.entries(channelNames).map(([key, value]) => (
        <option key={key} value={key}>{key == 0? "BF LED matrix full" : `Fluorescence ${value} nm Ex`}</option>
    ));

    useEffect(() => {
        async function updateMicroscopeParameters() {
            await microscopeControlService.update_parameters_from_client({
                [channelNames[illuminationChannel]]: [illuminationIntensity, cameraExposure],
            });
        }

        if (microscopeControlService) {
            updateMicroscopeParameters();
        }
    }, [illuminationIntensity, cameraExposure, illuminationChannel, microscopeControlService]);

    const updateMicroscopeStatus = async () => {
        const status = await microscopeControlService.get_status();
        updateUIBasedOnStatus(status);
    };
    
    const updateUIBasedOnStatus = (status) => {
        const channelName = channelNames[illuminationChannel];
        const { intensity, exposure } = status[`${channelName}_intensity_exposure`];
        setIlluminationIntensity(intensity);
        setCameraExposure(exposure);
    };

    const updateIlluminationChannel = async (newChannel) => {
        setIlluminationChannel(newChannel);
        addTileLayer(mapCurrent, newChannel);
        await updateMicroscopeStatus();
    }

    return (
        <>
            <div className="mb-4 flex flex-col flex-wrap justify-between">
            <div className="mb-4 w-full box-border">
                <div className="flex items-center mb-2">
                <label className="font-medium inline m-2">Illumination Intensity:</label>
                <span className="inline m-2">{illuminationIntensity}%</span>
                </div>
                <input
                type="range"
                className="w-full rounded-lg mt-1"
                min="0"
                max="100"
                value={illuminationIntensity}
                onChange={async (e) => { setIlluminationIntensity(parseInt(e.target.value, 10)); await updateMicroscopeStatus(); }}
                />
            </div>
    
            <div className="w-full box-border">
                <label className="font-medium block mb-2 mt-1">Illumination Channel:</label>
                <select
                className="w-full mt-2 rounded-lg mb-1 p-2"
                value={illuminationChannel}
                onChange={async (e) => { await updateIlluminationChannel(e.target.value); }}
                >
                {fluorescenceOptions}
                </select>
            </div>
            </div>
    
            <div className="flex flex-col items-start">
            <label className="font-medium block mt-1">Camera Exposure:</label>
            <input
                type="number"
                className="w-80 mt-2 rounded-lg border-gray-300 p-2 border-2"
                value={cameraExposure}
                onChange={async (e) => { setCameraExposure(parseInt(e.target.value, 10)); await updateMicroscopeStatus(); }}
            />
            </div>
        </>
    );
};

CameraSettings.propTypes = {
    mapCurrent: PropTypes.object,
    microscopeControlService: PropTypes.object,
    addTileLayer: PropTypes.func,
    channelNames: PropTypes.object,
};

export default CameraSettings;