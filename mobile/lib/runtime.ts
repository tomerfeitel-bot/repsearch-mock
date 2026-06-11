import Constants, { ExecutionEnvironment } from 'expo-constants';

// True when running inside the store Expo Go client. Skia (and therefore the
// Victory Native charts) is not available there — chart surfaces render a
// "needs the dev build" notice instead so Sessions 1-4 screens stay testable
// in Expo Go.
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
