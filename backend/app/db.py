# Database connection utilities
import mysql.connector
from mysql.connector import Error, errorcode
import os
import sys

# Import settings from root directory
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
root_dir = os.path.dirname(backend_dir)  # root/
sys.path.insert(0, root_dir)
from settings import DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT


def get_conn():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT,
        autocommit=False
    )


def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=DB_PORT,
            autocommit=False
        )
        return conn
    except Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            raise Error("Access denied: Check username and password")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            raise Error(f"Database '{DB_NAME}' does not exist")
        else:
            raise Error(f"Database connection error: {err}")


def get_db_cursor(conn):
    return conn.cursor(dictionary=True, buffered=True)