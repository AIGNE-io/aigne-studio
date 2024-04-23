import { WsClient } from '@arcblock/ws';
import get from 'lodash/get';
import { useEffect, useRef } from 'react';

const RELAY_SOCKET_PREFIX = '/.well-known/service';
const getAppId = () => get(window, 'blocklet.appPid') || get(window, 'blocklet.appId') || '';
const getAppPrefix = () => (get(window, 'env.apiPrefix') || '/').replace(/\/$/, '').replace(RELAY_SOCKET_PREFIX, '');
const getRelayChannel = (token: string) => `relay:${getAppId()}:${token}`;
const getRelayProtocol = () => (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
const getSocketHost = () => new URL(window.location.href).host;

/**
 * @description channel 的值不能包含分隔符 / . : 等，否则前端接受不到事件
 * @export
 * @param {string} channel
 * @return {*}
 */
export default function useSubscription(channel: string) {
  const socket = useRef<any>(null);
  const subscription = useRef<any>(null);

  useEffect(() => {
    if (getAppId()) {
      const needReconnect = !socket.current || socket.current.isConnected() === false;
      if (needReconnect) {
        socket.current = new WsClient(
          `${getRelayProtocol()}//${getSocketHost()}${getAppPrefix()}${RELAY_SOCKET_PREFIX}/relay`,
          {
            longpollerTimeout: 5000, // connection timeout
            heartbeatIntervalMs: 30 * 1000,
          }
        );
        socket.current.connect();
      }
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (channel) {
      let needSubscription = false;
      if (subscription.current) {
        if (subscription.current.channel !== channel) {
          socket.current.unsubscribe(getRelayChannel(subscription.current.channel));
          needSubscription = true;
        }
      } else {
        needSubscription = true;
      }

      if (needSubscription) {
        subscription.current = socket.current.subscribe(getRelayChannel(channel));
        subscription.current.channel = channel;
      }
    }
  }, [channel]); // eslint-disable-line react-hooks/exhaustive-deps

  return subscription.current;
}
