from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "zk2509",
    "database": "ShopSphere"
}


def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)


def safe_float(value, default=0.0):
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def safe_int(value, default=0):
    try:
        return int(value) if value is not None else default
    except (TypeError, ValueError):
        return default


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "ShopSphere backend is running"}), 200


@app.route("/inventory", methods=["GET"])
def get_inventory():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
        SELECT
            p.product_id,
            p.name,
            p.sku,
            p.category,
            p.price,
            p.status,
            i.stock_qty,
            i.reorder_level,
            i.last_updated
        FROM Products p
        JOIN Inventory i ON p.product_id = i.product_id
        ORDER BY p.product_id
        """
        cursor.execute(query)
        rows = cursor.fetchall()

        formatted = []
        for row in rows:
            stock = int(row["stock_qty"]) if row["stock_qty"] is not None else 0
            reorder_level = int(row["reorder_level"]) if row["reorder_level"] is not None else 0

            status = "AVAILABLE"
            if stock == 0:
                status = "OUT OF STOCK"
            elif stock <= reorder_level:
                status = "LOW STOCK"

            formatted.append({
                "id": row["product_id"],
                "name": row["name"],
                "sku": row["sku"],
                "category": row["category"],
                "price": float(row["price"]) if row["price"] is not None else 0,
                "stock": stock,
                "reorder_level": reorder_level,
                "status": status,
                "last_updated": row["last_updated"]
            })

        return jsonify(formatted), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
        SELECT
            p.product_id,
            p.name,
            p.price,
            p.status,
            i.stock_qty,
            i.reorder_level,
            i.last_updated
        FROM Products p
        JOIN Inventory i ON p.product_id = i.product_id
        WHERE p.product_id = %s
        """
        cursor.execute(query, (product_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "Product not found"}), 404

        stock = safe_int(row.get("stock_qty"))
        reorder_level = safe_int(row.get("reorder_level"))

        status = "AVAILABLE"
        if stock == 0:
            status = "OUT OF STOCK"
        elif stock <= reorder_level:
            status = "LOW STOCK"

        product = {
            "id": row["product_id"],
            "name": row["name"],
            "sku": None,
            "category": None,
            "price": safe_float(row.get("price")),
            "stock": stock,
            "reorder_level": reorder_level,
            "status": status,
            "last_updated": row.get("last_updated")
        }

        return jsonify(product), 200

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/notifications", methods=["GET"])
def get_notifications():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
        SELECT
            n.notification_id,
            n.product_id,
            p.name AS product_name,
            n.message,
            n.notification_type,
            n.created_at,
            n.is_read
        FROM Notifications n
        JOIN Products p ON n.product_id = p.product_id
        ORDER BY n.created_at DESC, n.notification_id DESC
        """
        cursor.execute(query)
        rows = cursor.fetchall()

        formatted = []
        for row in rows:
            formatted.append({
                "id": row["notification_id"],
                "product_id": row["product_id"],
                "product_name": row["product_name"],
                "message": row["message"],
                "type": row["notification_type"],
                "created_at": row["created_at"],
                "is_read": bool(row["is_read"])
            })

        return jsonify(formatted), 200

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/notifications/unread", methods=["GET"])
def get_unread_notifications():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
        SELECT
            n.notification_id,
            n.product_id,
            p.name AS product_name,
            n.message,
            n.notification_type,
            n.created_at,
            n.is_read
        FROM Notifications n
        JOIN Products p ON n.product_id = p.product_id
        WHERE n.is_read = FALSE
        ORDER BY n.created_at DESC, n.notification_id DESC
        """
        cursor.execute(query)
        rows = cursor.fetchall()

        formatted = []
        for row in rows:
            formatted.append({
                "id": row["notification_id"],
                "product_id": row["product_id"],
                "product_name": row["product_name"],
                "message": row["message"],
                "type": row["notification_type"],
                "created_at": row["created_at"],
                "is_read": bool(row["is_read"])
            })

        return jsonify(formatted), 200

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/notifications/<int:notification_id>/read", methods=["PUT"])
def mark_notification_read(notification_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = "UPDATE Notifications SET is_read = TRUE WHERE notification_id = %s"
        cursor.execute(query, (notification_id,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Notification not found"}), 404

        return jsonify({"message": "Notification marked as read"}), 200

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/restock", methods=["POST"])
def restock_product():
    conn = None
    cursor = None
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "JSON body required"}), 400

        product_id = data.get("product_id")
        added_stock = data.get("added_stock")

        if product_id is None or added_stock is None:
            return jsonify({"error": "product_id and added_stock are required"}), 400

        added_stock = safe_int(added_stock)
        if added_stock <= 0:
            return jsonify({"error": "added_stock must be greater than 0"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        check_query = "SELECT stock_qty FROM Inventory WHERE product_id = %s"
        cursor.execute(check_query, (product_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "Inventory record not found for this product"}), 404

        update_query = """
        UPDATE Inventory
        SET stock_qty = stock_qty + %s
        WHERE product_id = %s
        """
        cursor.execute(update_query, (added_stock, product_id))
        conn.commit()

        return jsonify({"message": "Product restocked successfully"}), 200

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/orders", methods=["POST"])
def place_order():
    conn = None
    cursor = None

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "JSON body required"}), 400

        customer_id = data.get("customer_id")
        shipping_address = data.get("shipping_address")
        items = data.get("items", [])
        payment_method = data.get("payment_method")
        payment_status = data.get("payment_status")
        transaction_ref = data.get("transaction_ref")

        if not customer_id or not shipping_address or not items or not payment_method or not payment_status:
            return jsonify({
                "error": "customer_id, shipping_address, items, payment_method, and payment_status are required"
            }), 400

        conn = get_db_connection()
        conn.start_transaction()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT customer_id FROM Customers WHERE customer_id = %s", (customer_id,))
        customer = cursor.fetchone()
        if not customer:
            conn.rollback()
            return jsonify({"error": "Customer not found"}), 404

        insert_order_query = """
        INSERT INTO Orders (customer_id, order_date, order_status, shipping_address)
        VALUES (%s, CURDATE(), 'Placed', %s)
        """
        cursor.execute(insert_order_query, (customer_id, shipping_address))
        order_id = cursor.lastrowid

        total_amount = 0.0

        for item in items:
            product_id = item.get("product_id")
            quantity = safe_int(item.get("quantity"))

            if not product_id or quantity <= 0:
                conn.rollback()
                return jsonify({"error": "Each item must have valid product_id and quantity"}), 400

            product_query = """
            SELECT product_id, price
            FROM Products
            WHERE product_id = %s
            """
            cursor.execute(product_query, (product_id,))
            product = cursor.fetchone()

            if not product:
                conn.rollback()
                return jsonify({"error": f"Product {product_id} not found"}), 404

            unit_price = safe_float(product["price"])
            total_amount += quantity * unit_price

            insert_item_query = """
            INSERT INTO Order_Items (order_id, product_id, quantity, unit_price_at_purchase)
            VALUES (%s, %s, %s, %s)
            """
            cursor.execute(insert_item_query, (order_id, product_id, quantity, unit_price))

        insert_payment_query = """
        INSERT INTO Payments (order_id, amount, payment_method, payment_status, transaction_ref)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(
            insert_payment_query,
            (order_id, total_amount, payment_method, payment_status, transaction_ref)
        )

        conn.commit()

        return jsonify({
            "message": "Order placed successfully",
            "order_id": order_id,
            "total_amount": total_amount
        }), 201

    except Error as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 400

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/orders", methods=["GET"])
def get_orders():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
        SELECT
            o.order_id,
            o.customer_id,
            o.order_date,
            o.order_status,
            o.shipping_address,
            p.payment_method,
            p.payment_status,
            p.transaction_ref,
            p.amount AS total_amount
        FROM Orders o
        LEFT JOIN Payments p ON o.order_id = p.order_id
        ORDER BY o.order_id DESC
        """
        cursor.execute(query)
        rows = cursor.fetchall()

        formatted = []
        for row in rows:
            formatted.append({
                "id": row["order_id"],
                "customer_id": row["customer_id"],
                "order_date": row["order_date"],
                "order_status": row["order_status"],
                "shipping_address": row["shipping_address"],
                "payment_method": row["payment_method"] or "",
                "payment_status": (row["payment_status"] or "PENDING").upper(),
                "transaction_ref": row["transaction_ref"],
                "total_amount": safe_float(row.get("total_amount"))
            })

        return jsonify(formatted), 200

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/orders/<int:order_id>", methods=["GET"])
def get_order_details(order_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        order_query = """
        SELECT
            o.order_id,
            o.customer_id,
            o.order_date,
            o.order_status,
            o.shipping_address,
            p.amount AS total_amount,
            p.payment_method,
            p.payment_status,
            p.transaction_ref,
            p.paid_at
        FROM Orders o
        LEFT JOIN Payments p ON o.order_id = p.order_id
        WHERE o.order_id = %s
        """
        cursor.execute(order_query, (order_id,))
        order_row = cursor.fetchone()

        if not order_row:
            return jsonify({"error": "Order not found"}), 404

        items_query = """
        SELECT
            oi.order_item_id,
            p.product_id,
            p.name AS product_name,
            oi.quantity,
            oi.unit_price_at_purchase
        FROM Order_Items oi
        JOIN Products p ON oi.product_id = p.product_id
        WHERE oi.order_id = %s
        """
        cursor.execute(items_query, (order_id,))
        item_rows = cursor.fetchall()

        items = []
        for item in item_rows:
            items.append({
                "order_item_id": item["order_item_id"],
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "quantity": safe_int(item["quantity"]),
                "unit_price": safe_float(item["unit_price_at_purchase"])
            })

        order_data = {
            "id": order_row["order_id"],
            "customer_id": order_row["customer_id"],
            "order_date": order_row["order_date"],
            "order_status": order_row["order_status"],
            "shipping_address": order_row["shipping_address"],
            "payment_method": order_row["payment_method"] or "",
            "payment_status": (order_row["payment_status"] or "PENDING").upper(),
            "transaction_ref": order_row["transaction_ref"],
            "paid_at": order_row["paid_at"],
            "total_amount": safe_float(order_row["total_amount"]),
            "items": items
        }

        return jsonify(order_data), 200

    except Error as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/orders/<int:order_id>/cancel", methods=["DELETE"])
def cancel_order(order_id):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        conn.start_transaction()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT product_id, quantity
            FROM Order_Items
            WHERE order_id = %s
        """, (order_id,))
        items = cursor.fetchall()

        if not items:
            conn.rollback()
            return jsonify({"error": "Order not found"}), 404

        for item in items:
            cursor.execute("""
                UPDATE Inventory
                SET stock_qty = stock_qty + %s
                WHERE product_id = %s
            """, (item["quantity"], item["product_id"]))

        cursor.execute("DELETE FROM Payments WHERE order_id = %s", (order_id,))
        cursor.execute("DELETE FROM Order_Items WHERE order_id = %s", (order_id,))
        cursor.execute("DELETE FROM Orders WHERE order_id = %s", (order_id,))

        conn.commit()

        return jsonify({"message": "Order cancelled and stock restored"}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/inventory", methods=["POST"])
def add_inventory():
    conn = None
    cursor = None

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "JSON body required"}), 400

        name = data.get("name")
        sku = data.get("sku")
        category = data.get("category")
        price = float(data.get("price", 0))
        stock = int(data.get("stock", 0))
        reorder_level = int(data.get("reorder_level", 5))

        if not name:
            return jsonify({"error": "Product name is required"}), 400

        conn = get_db_connection()
        conn.start_transaction()
        cursor = conn.cursor(dictionary=True)

        if sku:
            cursor.execute("SELECT product_id FROM Products WHERE sku = %s", (sku,))
            existing = cursor.fetchone()
            if existing:
                conn.rollback()
                return jsonify({"error": "SKU already exists"}), 400

        supplier_id = 1   # change this if your actual supplier id is different

        product_status = "Available" if stock > 0 else "Out of Stock"

        insert_product_query = """
        INSERT INTO Products (name, sku, category, price, status, supplier_id)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_product_query, (name, sku, category, price, product_status, supplier_id))
        product_id = cursor.lastrowid

        insert_inventory_query = """
        INSERT INTO Inventory (product_id, stock_qty, reorder_level)
        VALUES (%s, %s, %s)
        """
        cursor.execute(insert_inventory_query, (product_id, stock, reorder_level))

        conn.commit()

        return jsonify({
            "message": "Product added successfully",
            "id": product_id,
            "name": name,
            "sku": sku,
            "category": category,
            "price": price,
            "stock": stock,
            "reorder_level": reorder_level
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/inventory/<int:product_id>", methods=["PUT"])
def update_inventory(product_id):
    conn = None
    cursor = None

    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "JSON body required"}), 400

        # Frontend sends: stock, reorder_level
        stock = data.get("stock")
        reorder_level = data.get("reorder_level")

        if stock is None and reorder_level is None:
            return jsonify({"error": "At least one of stock or reorder_level is required"}), 400

        conn = get_db_connection()
        conn.start_transaction()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT stock_qty, reorder_level FROM Inventory WHERE product_id = %s",
            (product_id,)
        )
        inventory = cursor.fetchone()

        if not inventory:
            conn.rollback()
            return jsonify({"error": "Inventory record not found"}), 404

        new_stock = inventory["stock_qty"] if stock is None else safe_int(stock)
        new_reorder_level = inventory["reorder_level"] if reorder_level is None else safe_int(reorder_level)

        if new_stock < 0 or new_reorder_level < 0:
            conn.rollback()
            return jsonify({"error": "stock and reorder_level cannot be negative"}), 400

        cursor.execute("""
            UPDATE Inventory
            SET stock_qty = %s, reorder_level = %s
            WHERE product_id = %s
        """, (new_stock, new_reorder_level, product_id))

        product_status = "Available"
        if new_stock == 0:
            product_status = "Out of Stock"
        elif new_stock <= new_reorder_level:
            product_status = "Low Stock"

        cursor.execute("""
            UPDATE Products
            SET status = %s
            WHERE product_id = %s
        """, (product_status, product_id))

        conn.commit()

        return jsonify({
            "message": "Inventory updated successfully",
            "id": product_id,
            "stock": new_stock,
            "reorder_level": new_reorder_level,
            "status": "OUT OF STOCK" if new_stock == 0 else ("LOW STOCK" if new_stock <= new_reorder_level else "AVAILABLE")
        }), 200

    except Error as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    app.run(debug=True, port=5001)