FROM python:3.10-slim

WORKDIR /app

# 依赖层单独缓存
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 应用代码（含 app/data 岗位种子数据）
COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
