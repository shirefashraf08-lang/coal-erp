# Stage 1: Build Angular
FROM node:22-alpine AS angular-build
WORKDIR /angular
COPY coal-erp/package*.json ./
RUN npm ci --legacy-peer-deps
COPY coal-erp/ ./
RUN npx ng build --configuration production

# Stage 2: Build .NET API
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS dotnet-build
WORKDIR /src
COPY CoalErp.Api/ ./
WORKDIR /src/CoalErp.Api
RUN dotnet restore CoalErp.Api.csproj
RUN dotnet publish CoalErp.Api.csproj -c Release -o /publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=dotnet-build /publish ./
COPY --from=angular-build /angular/dist/coal-erp/browser ./wwwroot/browser
EXPOSE 5000
ENV ASPNETCORE_ENVIRONMENT=Production
CMD dotnet CoalErp.Api.dll --urls "http://+:${PORT:-5000}"