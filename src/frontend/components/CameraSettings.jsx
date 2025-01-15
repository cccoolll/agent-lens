import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const CameraSettings = ({ microscopeControlService }) => {
    const [cameraExposure, setCameraExposure] = useState(100);
    const [illuminationIntensity, setIlluminationIntensity] = useState(50);
    const [illuminationChannel, setIlluminationChannel] = useState("0");
  
    const channelKeyMap = {
      0: "BF",
      11: 405,
      12: 488,
      14: 561,
      13: 638,
      15: 730,
    };

    useEffect(() => {
        async function updateMicroscopeParamters() {
            await microscopeControlService.update_parameters_from_client({
                [channelKeyMap[illuminationChannel]]: [illuminationIntensity, cameraExposure],
            });
        }

        updateMicroscopeParamters();
    }, [illuminationIntensity, cameraExposure, illuminationChannel]);

    const fluorescenceOptions = Object.entries(channelKeyMap).map(([key, value]) => (
        key == 0?
            <option key={key}>BF LED matrix full</option>
            : <option key={key} value={key}>Fluorescence {value} nm Ex</option>
    ));

    const updateMicroscopeStatus = async () => {
        const status = await microscopeControlService.get_status();
        updateUIBasedOnStatus(status);
    };
    
    const updateUIBasedOnStatus = (status) => {
        const channelName = channelKeyMap[illuminationChannel];
        const { intensity, exposure } = status[`${channelName}_intensity_exposure`];
        setIlluminationIntensity(intensity);
        setCameraExposure(exposure);
    };

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
                onChange={async (e) => { setIlluminationChannel(e.target.value); await updateMicroscopeStatus(); }}
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
    microscopeControlService: PropTypes.object.isRequired,
};

export default CameraSettings;