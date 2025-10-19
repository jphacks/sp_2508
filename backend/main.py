import uvicorn
from fastapi import FastAPI

app = FastAPI()

t_flag = False
k_flag = False
y_flag = False

# 現在の保留リクエスト状態（シンプルな共有状態）
current_request = {
    "type": None,  # "kinkyu" または "yoyaku"
    "user_id": None,  # 要請者の id
    "waiting": False,  # ドライバーの応答待ち（緊急のみ True）
    "accepted_by": None,  # 受理したドライバー id （受理後にセット）
}


@app.post("/")
async def root(user: dict):
    """
    ドライバーはポーリング用（user['car'] == True）
    - ドライバー: 緊急の waiting=True の要請、または予約(type=="yoyaku")を返す
    要請者は自分の要請が受理されたか確認（user['car'] == False）
    - 緊急は waiting 中か受理確認、予約は pending/accepted を返す
    受理確認後はリクエストをリセットします（どちらも同様）。
    """
    # global は関数内で変数を参照・更新する前に宣言しておく
    global t_flag, k_flag, y_flag

    uid = user.get("id")
    car = bool(user.get("car", False))

    if car:
        # ドライバーに対して返す：緊急で waiting 中のもの優先、なければ予約を返す
        if current_request["waiting"]:
            return {
                "waiting": True,
                "type": current_request["type"],
                "user_id": current_request["user_id"],
                "t_flag": t_flag,
                "k_flag": k_flag,
                "y_flag": y_flag,
            }
        if current_request["type"] == "yoyaku":
            return {
                "waiting": False,
                "type": current_request["type"],
                "user_id": current_request["user_id"],
                "t_flag": t_flag,
                "k_flag": k_flag,
                "y_flag": y_flag,
            }
        return {"waiting": False, "type": None}
    else:
        # 要請者は自分の要請が受理されたか確認する
        if current_request["user_id"] == uid:
            if current_request["accepted_by"]:
                accepted_by = current_request["accepted_by"]
                # リクエストとフラグをリセット
                current_request.update({"type": None, "user_id": None, "waiting": False, "accepted_by": None})
                t_flag, k_flag, y_flag = False, False, False
                return {"status": "accepted", "accepted_by": accepted_by}
            # 自分の要請があるが未受理：緊急なら waiting、予約なら pending を返す
            if current_request["type"] == "kinkyu" and current_request["waiting"]:
                return {"status": "waiting"}
            if current_request["type"] == "yoyaku":
                return {"status": "pending"}
        # 自分の要請がない（または別の要請が流れている）
        return {"status": "none"}


@app.post("/kinkyu/")
async def kinkyu(user: dict):
    """
    緊急要請を作成（要請者: car == False）
    body 例: {"id": "@haru", "car": False}
    緊急は要請者が待機（waiting=True）して処理を一時停止する想定。
    """
    uid = user.get("id")
    car = bool(user.get("car", False))
    if car:
        return {"error": "request must be from non-car user"}

    global current_request, t_flag, k_flag, y_flag
    current_request.update({"type": "kinkyu", "user_id": uid, "waiting": True, "accepted_by": None})
    t_flag = True
    k_flag = False
    y_flag = False
    return {"message": "kinkyu requested", "user_id": uid}


@app.post("/yoyaku/")
async def yoyaku(user: dict):
    """
    予約要請を作成（要請者: car == False）
    body 例: {"id": "@haru", "car": False, "register": "20060322"}
    予約は waiting=False のまま current_request に保存し、ドライバーは再読み込みしても確認可能。
    """
    uid = user.get("id")
    car = bool(user.get("car", False))
    if car:
        return {"error": "request must be from non-car user"}

    global current_request, t_flag, k_flag, y_flag
    # 予約は waiting を立てない（要請者は待たない）
    current_request.update({"type": "yoyaku", "user_id": uid, "waiting": False, "accepted_by": None})
    t_flag = True
    k_flag = False
    y_flag = True
    return {"message": "yoyaku requested", "user_id": uid}


@app.post("/accept/")
async def accept(user: dict):
    """
    ドライバーが保留中のリクエストを受ける（driver: car == True）
    body 例: {"id": "@driver", "car": True}
    緊急・予約どちらでも受理可能。受理後 accepted_by をセットし waiting を False にする。
    """
    # global は参照・変更する前に関数先頭で宣言する
    global current_request, t_flag, k_flag

    driver_id = user.get("id")
    car = bool(user.get("car", False))
    if not car:
        return {"error": "only drivers can accept"}

    if not current_request["type"]:
        return {"error": "no current request"}

    # 受理処理
    current_request["accepted_by"] = driver_id
    current_request["waiting"] = False
    t_flag = True
    k_flag = True
    return {"message": "accepted", "accepted_by": driver_id, "for_user": current_request.get("user_id")}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
