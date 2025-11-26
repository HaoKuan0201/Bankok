// ===============================================
// 1. 常數與初始化 (保持不變)
// ===============================================

// 假設這些常數在其他地方定義 (例如 STORAGE_KEY, CHECK_KEY_SUFFIX, COST_KEY_SUFFIX, showToast)
// const STORAGE_KEY = 'tripData'; 
// const CHECK_KEY_SUFFIX = '_checked';
// const COST_KEY_SUFFIX = '_cost';
// function showToast(message) { console.log(`[Toast] ${message}`); } 

// 2. 設定您的金鑰和 URL (保持不變)
const SUPABASE_URL = 'https://fpknobaqsycfvcftcqgq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9aL5kTXzgwyIlG9sXX_O5Q_q8shoFmZ';

// 3. 初始化 Supabase Client (保持不變)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 固定的目標行程標題，用於讀取和儲存 (保持不變)
const targetTitle = '曼谷五日自由行 (11/27 - 12/1)';
const TARGET_TABLE = 'T_Travel_Trips'; 

// ===============================================
// 4. 讀取資料函式 (fetchTripData - 保持不變)
// ===============================================

async function fetchTripData() {
    console.log('嘗試從 Supabase 讀取資料...');

    const { data, error } = await supabaseClient
        .from(TARGET_TABLE) 
        .select('json_data') 
        .eq('title', targetTitle) 
        .limit(1);

    if (error) {
        console.error('從 Supabase 讀取資料失敗:', error.message);
        showToast('❌ 雲端資料讀取失敗！');
        return null;
    }

    if (data && data.length > 0) {
        console.log('資料讀取成功！');
        const tripDataFromDB = data[0].json_data; 
         
        // a. 移除所有與「完成狀態」和「實際花費」相關的 Local Storage 紀錄 (如您原碼所示)
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.endsWith(CHECK_KEY_SUFFIX) || key.endsWith(COST_KEY_SUFFIX))) {
                localStorage.removeItem(key);
            }
        }
         
        try {
            // b. 將雲端資料儲存到 Local Storage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tripDataFromDB));
             
            // c. 顯示提示並刷新頁面
            showToast('✅ 已從雲端更新並載入最新行程！');
            console.log('Local Storage 已更新，準備刷新頁面...');
             
            // 延遲刷新，讓使用者看到 toast 提示
            setTimeout(() => {
                location.reload();
            }, 1200);

        } catch (e) {
            console.error('儲存或刷新頁面失敗:', e);
            showToast('❌ 雲端資料獲取成功，但儲存失敗。');
        }

        return tripDataFromDB;
    } else {
        console.log(`未找到標題為 "${targetTitle}" 的行程資料。`);
        showToast('ℹ️ 未找到最新雲端行程資料，使用本地數據。');
        return null;
    }
}

// ===============================================
// 5. 儲存資料函式 (saveTripData) - 使用明確 UPDATE 語句
// ===============================================

/**
 * 將新的行程資料儲存/更新到 Supabase。
 * @param {object} newTripJson - 包含完整行程資料 (含 title, days 等) 的 JSON 物件。
 * @returns {Promise<boolean>} - 儲存成功或失敗。
 */
async function saveTripData(newTripJson) {
    if (!newTripJson || !newTripJson.title) {
        console.error('無法儲存：新的行程資料物件無效。');
        showToast('❌ 儲存失敗：資料格式錯誤。');
        return false;
    }

    const currentTitle = newTripJson.title;

    // 1. 構造要更新的物件
    const dataToUpdate = {
        // title: newTripJson.title, // UPDATE 不需要 title，除非要修改它
        start_date: newTripJson.days && newTripJson.days.length > 0 ? newTripJson.days[0].fullDate : null,
        end_date: newTripJson.days && newTripJson.days.length > 0 ? newTripJson.days[newTripJson.days.length - 1].fullDate : null,
        json_data: newTripJson, // 儲存整個行程物件
    };

    console.log(`嘗試將資料更新到 Supabase (Title: ${currentTitle})...`);
    console.log(dataToUpdate); // 修正為 dataToUpdate

    // 2. 使用明確的 UPDATE 語句 + eq() 條件，並要求返回更新後的資料
    const { data, error } = await supabaseClient
        .from(TARGET_TABLE)
        .update(dataToUpdate) // 使用 UPDATE
        .eq('title', currentTitle) // 篩選條件
        .select('updated_at'); // 只選 updated_at (或其他您需要的欄位) 提升效率

    if (error) {
        console.error('❌ Supabase 明確錯誤:', error.message, error);
        showToast(`❌ 雲端更新失敗: ${error.message}`);
        return false;
    }

    if (data && data.length > 0) {
        const updatedTime = data[0].updated_at ? new Date(data[0].updated_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '成功';
        
        console.log(`✅ 資料已成功更新至 Supabase。更新了 ${data.length} 行。`);
        showToast(`💾 雲端儲存成功！最後更新時間：${updatedTime}`);
        return true;
    } else {
        // 沒有錯誤但沒有行被更新 (通常是 title 不匹配)
        console.warn(`⚠️ 儲存失敗：Supabase 回報更新了 0 行。請檢查行程標題是否正確存在。`);
        showToast('⚠️ 雲端更新未變動：請檢查行程標題是否正確。');
        return false;
    }
}

// 頁面載入後執行
window.loadRemoteData = fetchTripData;
window.saveRemoteData = saveTripData; // 暴露給 HTML 呼叫
