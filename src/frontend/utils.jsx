const getServerUrl = () => {
    return getUrlParam("server") || window.location.origin;
  }

const getUrlParam = (param_name) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param_name);
}

const isLocal = () => {
    const serverUrl = getServerUrl();
    const localHosts = ["127.0.0.1", "localhost", "0.0.0.0"];
return localHosts.includes(new URL(serverUrl).hostname);
}

const getService = async (server, remoteId, localId = null) => {
    const serviceId = localId && isLocal()? localId : remoteId;
    const svc = await server.getService(serviceId);
    return svc;
};

export { getServerUrl, getUrlParam, isLocal, getService };