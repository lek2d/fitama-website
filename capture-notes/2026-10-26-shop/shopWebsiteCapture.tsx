import {registerRootComponent} from 'expo';
import {Fredoka_400Regular,Fredoka_500Medium,Fredoka_600SemiBold,Fredoka_700Bold,useFonts} from '@expo-google-fonts/fredoka';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {TamaShopContents} from '../src/components/shop/TamaShopContents';
import {SHOP_PRICES,shopItemKind,type ShopItemId,type ShopState} from '../src/domain/tamaShop';

// Website screenshot fixture only: actual shared UI, sample funds, no gateway.
const sampleState:ShopState={
  owner:'website-capture-only',generation:0,enabled:false,catalogVersion:1,coinBalance:100,
  care:null,equipment:{ownedItemIds:[],instances:[],equipped:{},equippedInstanceIds:{}},
  catalog:(Object.keys(SHOP_PRICES) as ShopItemId[]).map(itemId=>({itemId,price:SHOP_PRICES[itemId],...shopItemKind(itemId)})),
};
const noAction=()=>{};
function ShopWebsiteCapture(){
  const [fontsLoaded]=useFonts({Fredoka_400Regular,Fredoka_500Medium,Fredoka_600SemiBold,Fredoka_700Bold});
  if(!fontsLoaded)return null;
  return <SafeAreaProvider><TamaShopContents state={sampleState} loading={false} error={null}
    onSelect={noAction} onClose={noAction} onRetry={noAction}/></SafeAreaProvider>;
}
registerRootComponent(ShopWebsiteCapture);
